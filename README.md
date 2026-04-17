# bbuddy — build your own coding companion

🌐 **English** · [한국어](./README.ko.md)

[![test](https://img.shields.io/github/actions/workflow/status/gokomong/bbuddy/test.yml?branch=master&label=test)](https://github.com/gokomong/bbuddy/actions/workflows/test.yml)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](./package.json)
[![tests](https://img.shields.io/badge/tests-315%20passing-brightgreen)](./src/__tests__)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> A statusline-resident ASCII companion for Claude Code and Codex CLI. Fork of
> [fiorastudio/buddy](https://github.com/fiorastudio/buddy) with a creator
> layer so **you design the character from scratch** — species, appearance,
> personality, stats.

```
  /\_/\          ┌──────────────────────────────────────────┐
 ( ■.■ )  ─────▶ │ Mochi (Lv.7) · tsundere                  │
  > ~ <          │ DEBUGGING ████████████████  40           │
 /|___|\ HaCk!   │ PATIENCE  ██████████        25           │
                 │ CHAOS     ████              10           │
                 └──────────────────────────────────────────┘
  custom companion, 100-pt stat budget, 6 personality presets
```

Every other MCP-companion project hands you a **random species**. bbuddy is
the one where **you pick every pixel** — or have Claude draw it for you.

---

## Table of contents

- [Install](#install)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [MCP tools](#mcp-tools)
- [Wizard flow](#wizard-flow)
- [Hooks](#hooks)
- [Skills](#skills)
- [File layout](#file-layout)
- [Testing](#testing)
- [Credits](#credits)
- [License](#license)

Deeper docs: [AGENTS.md](./AGENTS.md) (architecture + conventions) ·
[HANDOFF.md](./HANDOFF.md) (session-by-session decisions) ·
[CHANGELOG.md](./CHANGELOG.md) (release history) ·
[CONTRIBUTING.md](./CONTRIBUTING.md) (dev loop).

---

## Install

### One-click (recommended)

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/gokomong/bbuddy/master/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/gokomong/bbuddy/master/install.ps1 | iex
```

The installer handles:

- Build the MCP server under `~/.bbuddy/server/`
- Register the MCP server with Claude Code / Cursor / Windsurf / Codex CLI
- Wire Claude Code hooks (SessionStart, Stop, Pre/PostToolUse)
- Copy slash-command skills (`/bbuddy:create`, `:show`, `:pet`, …)
- Inject the statusline env var into your shell RC file
- Append the companion system-prompt to each CLI's instruction file

The installer auto-detects **Bun** and uses it when present (5–10× faster
`install`), falling back to `npm` if the native rebuild fails.

### Manual install

```bash
git clone https://github.com/gokomong/bbuddy.git ~/.bbuddy/server
cd ~/.bbuddy/server
npm install && npm run build      # or: bun install && bun run build
```

Add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "bbuddy": {
      "command": "node",
      "args": ["/absolute/path/to/.bbuddy/server/dist/server/index.js"]
    }
  }
}
```

For the statusline, add this to your shell RC file (`~/.zshrc`,
`~/.bashrc`, or PowerShell `$PROFILE`):
```bash
export CLAUDE_CODE_STATUSLINE_CMD="node $HOME/.bbuddy/server/dist/statusline-wrapper.js"
```

Claude Code reads that env var at session start; there is no
`settings.json` field for statusline command.

---

## Quick start

### Create your companion

In a Claude Code session:

```
/bbuddy:create
```

The wizard renders a framed card at every step:

```
[1/4] Choose a name            → "Mochi"
[2/4] Pick appearance mode     → 1 species | 2 parts | 3 AI draws | 4 manual
[3/4] Pick personality preset  → tsundere / passionate / cold / prankster / sage / custom
[4/4] Distribute stats         → 100 pt across DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK
Preview → confirm: true → saved
```

### Check status

```
/bbuddy:show
```

### Other commands

`/bbuddy:pet`, `/bbuddy:stats`, `/bbuddy:evolve`, `/bbuddy:save <slot>`,
`/bbuddy:list`, `/bbuddy:summon <slot>`, `/bbuddy:dismiss <slot>`,
`/bbuddy:language en|ko`, `/bbuddy:off`, `/bbuddy:on`, `/bbuddy:respawn`.
Full list in [Skills](#skills).

---

## Architecture

```
┌─────────────────────────────────────────────┐
│             bbuddy creator layer            │
│                                             │
│   wizard   AI delegation   parts combiner   │
│   personality   stats   custom sprites      │
└──────────────────────┬──────────────────────┘
                       │ fork + extends
┌──────────────────────┴──────────────────────┐
│          fiorastudio/buddy (base)           │
│                                             │
│   MCP server   SQLite   21 species          │
│   XP / leveling  observer  memories/dreams  │
│   rarity / stats   statusline renderer      │
└──────────────────────┬──────────────────────┘
                       │ runs on
┌──────────────────────┴──────────────────────┐
│   Claude Code · Cursor · Windsurf · Codex   │
└─────────────────────────────────────────────┘
```

### Tech stack

| Area | Choice |
|---|---|
| Runtime | Node.js 20+ / TypeScript (NodeNext) — Bun 1.0+ also supported |
| Database | SQLite (`better-sqlite3`) at `~/.bbuddy/bbuddy.db` |
| MCP | `@modelcontextprotocol/sdk` |
| AI ASCII generation | Delegated to host LLM (no API key required) |
| Tests | Vitest (315 passing) |
| Build | `tsc` |

For full Phase 1–6 history, see [AGENTS.md §7](./AGENTS.md) and
[CHANGELOG.md](./CHANGELOG.md).

---

## MCP tools

| Tool | Description |
|---|---|
| `bbuddy_create` | Wizard-based companion creation (modes 1–4) |
| `bbuddy_hatch` | Hash-seeded random companion from the 21 built-in species |
| `bbuddy_status` | Render the companion card |
| `bbuddy_pet` | Pet the companion — mood bump + small reaction |
| `bbuddy_observe` | Opt-in coding-task reaction as a speech-bubble card + XP (use the `<!-- bbuddy: -->` comment pipeline for ambient reactions instead) |
| `bbuddy_evolve` | Change appearance only (same personality / stats / XP) |
| `bbuddy_remember` | Save a long-term memory |
| `bbuddy_dream` | Consolidate memories into personality drift |
| `bbuddy_mute` / `bbuddy_unmute` | Toggle observer chatter |
| `bbuddy_respawn` | Permanently release the active companion |
| `bbuddy_save` | Snapshot the current companion into a named slot |
| `bbuddy_list` | List saved slots |
| `bbuddy_summon` | Restore from a slot (current companion auto-backed up to `__previous`) |
| `bbuddy_dismiss` | Permanently delete a saved slot |
| `bbuddy_language` | Switch UI language (`en` / `ko`) |

### Reaction pipeline — prefer the comment

`bbuddy_observe` is explicit-only. For ambient coding reactions use the
`<!-- bbuddy: {≤15 chars} -->` comment at the end of a Claude response —
the Stop hook collects it and displays it as a statusline bubble. The
comment path costs ~15 tokens; `bbuddy_observe` costs ~200. The
installer injects that convention into each CLI's system prompt.

---

## Wizard flow

`bbuddy_create` / `bbuddy_evolve` is **stateless** — the tool evaluates
whatever parameters you pass, renders the next step as a framed card,
and returns. Keep re-calling with accumulated parameters until
`confirm: true` commits.

```
name
  └─▶ appearance_mode
        ├─ "1" ─▶ species ──────────────────────┐
        ├─ "2" ─▶ parts (face/eye/accessory/body)┤
        ├─ "3" ─▶ ai_prompt ────────────────────┤
        └─ "4" ─▶ manual_frame1/2/3 ────────────┘
                                                 │
                                        personality_preset
                                                 │
                                              stats
                                                 │
                                          confirm: true
                                                 │
                                          saved ✅
```

### Parameter signature

```typescript
bbuddy_create({
  name: string,
  appearance_mode: "1" | "2" | "3" | "4",

  // mode 1
  species?: string,                         // one of 21 built-ins

  // mode 2
  parts?: {
    face: "round" | "square" | "pointy" | "blob",
    eye: string,                            // "·" "o" "♥" any char
    accessory: "hat"|"crown"|"horns"|"ears"|"halo"|"antenna"|"bow"|"none",
    body: "arms"|"tiny"|"legs"|"tail"|"float"|"none",
  },

  // mode 3 — host LLM draws the ASCII
  ai_prompt?: string,                       // "cat wearing sunglasses"

  // mode 4 — raw ASCII, \n-separated, ≤ 6 rows × 14 cols
  manual_frame1?: string,
  manual_frame2?: string,
  manual_frame3?: string,

  // shared
  personality_preset?: "tsundere"|"passionate"|"cold"|"prankster"|"sage"|"custom",
  custom_prompt?: string,                   // required when preset === "custom"
  stats?: {
    DEBUGGING: number,   // sum = 100, each 1–80
    PATIENCE: number,
    CHAOS: number,
    WISDOM: number,
    SNARK: number,
  },
  confirm?: boolean,
})
```

---

## Hooks

| File | Event | Role |
|---|---|---|
| `hooks/session-start.mjs` | SessionStart | Read status file → inject companion context into Claude's system prompt. Prompt for `/bbuddy:create` if no companion exists. |
| `hooks/stop.mjs` | Stop | Scan the transcript for `<!-- bbuddy: ... -->` and store the reaction in the status file. |
| `hooks/pre-tool-use.mjs` | PreToolUse(Bash) | Set `working` indicator (⚙). |
| `hooks/post-tool-use.mjs` | PostToolUse(Bash) | Exit code ↦ `excited` (★) on success, `concerned` (>.<) on failure. |
| `hooks/codex-session-start.mjs` | Codex CLI | Same as session-start, English-only context. |
| `hooks/codex-stop.mjs` | Codex CLI | Render an ANSI sprite to stdout (Codex has no statusline API). |

### Reaction schema

Written to `~/.claude/bbuddy-status.json`:

```typescript
{
  reaction: "excited" | "concerned" | "working" | "chime",
  reaction_expires: number,      // ms timestamp
  reaction_eye: string,          // e.g. "★" or ">.<"
  reaction_indicator: string,    // shown next to the name
  reaction_text: string,         // bubble content
}
```

---

## Skills

Invoked as `/bbuddy:<name>` in Claude Code. Each `SKILL.md` is a short
instruction file telling Claude which MCP tool to call and how to
present the response.

```
/bbuddy:create    wizard to build a new companion
/bbuddy:show      companion status card
/bbuddy:pet       pet the companion
/bbuddy:stats     stat breakdown
/bbuddy:rename    rename (snapshot → respawn → recreate)
/bbuddy:evolve    change appearance
/bbuddy:save      save to a named slot
/bbuddy:list      list saved slots
/bbuddy:summon    load from a slot
/bbuddy:dismiss   delete a saved slot
/bbuddy:language  switch UI language (en|ko)
/bbuddy:hatch     random companion roll
/bbuddy:observe   explicit reaction card (opt-in)
/bbuddy:remember  save a memory
/bbuddy:dream     consolidate memories
/bbuddy:respawn   delete the active companion (destructive)
/bbuddy:off       mute observer chatter
/bbuddy:on        unmute
```

---

## File layout

```
bbuddy/
├── src/
│   ├── server/index.ts           # MCP server — 16 tools + resources
│   ├── creator/
│   │   ├── wizard.ts             # state machine + shared .___. card shell
│   │   ├── parts-combiner.ts     # mode 2 (face/eye/accessory/body)
│   │   ├── manual-input.ts       # mode 4 (raw ASCII)
│   │   ├── presets.ts            # 6 personality presets + bio templates
│   │   ├── stats.ts              # 100-pt stat distribution validator
│   │   └── sprites/parts.json
│   ├── db/schema.ts              # SQLite schema + legacy-path migration
│   ├── i18n/                     # English (default) + Korean catalogs
│   ├── lib/                      # types, species, observer, leveling…
│   ├── statusline-wrapper.ts     # ~1 s statusline renderer
│   └── __tests__/                # vitest (315)
├── hooks/*.mjs                   # Claude Code + Codex hooks
├── skills/*/SKILL.md             # 18 slash commands
├── .claude-plugin/               # Claude Code plugin manifest + .mcp.json
├── .codex-plugin/                # Codex plugin manifest + .mcp.json
├── install.sh · install.ps1      # One-click installers
└── package.json
```

---

## Testing

```bash
npm test                # 315 tests (vitest)
npm run test:coverage   # coverage report under coverage/
npm run build           # TypeScript → dist/
```

Coverage at 35% line — the high-value creator, species, lib paths are
well-covered; `src/server/index.ts` (MCP tool handlers) is integration
surface and is exercised manually through Claude Code rather than unit
tests.

No API key is required to run anything — AI appearance generation
(mode 3) delegates to the host LLM (Claude Code / Codex) itself.

---

## Credits

- **Upstream**:
  [**fiorastudio/buddy**](https://github.com/fiorastudio/buddy) — the
  original MCP companion project: 21 species, MCP server scaffolding,
  statusline renderer, XP/dream/evolution systems. bbuddy is a fork,
  not a rewrite; the base hatching/status/presence logic is unchanged.
  MIT-compatible.
- **Speech-bubble design**:
  [**gokomong/claude-buddy**](https://github.com/gokomong/claude-buddy)
  — the "keep your Claude Code buddy forever" project that pioneered
  the ASCII speech-bubble box used in bbuddy's statusline
  (`src/statusline-wrapper.ts`). Ported here in commit `26f01f6`.

### What bbuddy adds

- **Creator system** — 4-mode wizard (species / parts / AI delegate /
  manual ASCII), 6 personality presets, 100-pt stat distribution,
  `custom_sprites` table.
- **Slots** — `bbuddy_save / list / summon / dismiss`, automatic
  `__previous` backup on swap.
- **i18n** — English default with Korean opt-in via `bbuddy_language`.
- **Tool-driven creation wizard** — framed `.______.` card rendered by
  the MCP tool itself; the skill markdown just relays verbatim, no
  LLM-scripted conversation.
- **Statusline hardening** — stable anchor across reaction states,
  terminal-width auto-detection (tmux, WezTerm, kitty, `stty`), CJK
  visual-width math, zero HUD-plugin dependencies.
- **Codex CLI extension** — Codex-specific hooks with ANSI sprite
  rendering via stdout (Codex has no statusline API).
- **Packaging** — marketplace-ready `.mcp.json` manifests with
  `${CLAUDE_PLUGIN_ROOT}` / `${CODEX_PLUGIN_ROOT}`; legacy-DB
  auto-migration from `~/.bbddy/` and `~/.buddy/`.

---

## License

MIT — see [LICENSE](./LICENSE).
