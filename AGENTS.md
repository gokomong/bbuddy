# bbuddy — Agent & Contributor Context

This document is the canonical project brief for anyone — human or LLM —
who needs to understand bbuddy before making changes. Claude Code,
Codex CLI, and Cursor all auto-load it into the system prompt at
session start.

Keep it up to date. If you change architecture, add a big feature, or
change a convention, update the relevant section here in the same
commit.

---

## 1. What bbuddy is

A coding companion that lives in your terminal statusline. You hatch
(or custom-create) a small ASCII creature with its own name, species,
personality, and stats. It reacts to your work through:

- **A persistent right-aligned ASCII sprite** in the Claude Code
  statusline, animated every ~2.5s.
- **A speech bubble** that pops up for ~30 seconds when Claude appends
  `<!-- bbuddy: {short reaction} -->` to a response.
- **Hook-driven reaction states** (`working` ⚙ on Bash start,
  `excited` on success, `concerned` on failure).
- **MCP tools** the user can call directly (`bbuddy_create`,
  `bbuddy_pet`, `bbuddy_observe`, slot ops, etc).

The project is a fork of `fiorastudio/buddy`. bbuddy's distinguishing
layer is the **creator system** (4 appearance modes + personality
presets + manual stat distribution), the **slot system** for saving
multiple companions, **i18n (en/ko)**, and a **terminal-aware
statusline renderer** that works without any HUD plugin.

---

## 2. Architecture map

```
┌──────────── Claude Code (or Codex CLI) ────────────┐
│                                                     │
│  MCP tools         Slash commands    Statusline     │
│  (18 tools)        (16 /bbuddy:* )   (wrapper.js)   │
│       │                   │                 │       │
│       └─── src/server ────┤                 │       │
│       ┌─── src/creator ───┤                 │       │
│       ┌─── src/i18n ──────┤                 │       │
│       ┌─── src/lib ───────┤                 │       │
│       │                   │                 │       │
│       │     Hooks (Node)  │                 │       │
│       │    - session-start   (context inject)       │
│       │    - pre-tool-use    (reaction → working)   │
│       │    - post-tool-use   (reaction → excited/concerned) │
│       │    - stop            (scan for <!-- bbuddy: --> )   │
│       │                                              │
│       └─→ DB:  ~/.bbuddy/bbuddy.db (SQLite)          │
│           State: ~/.claude/bbuddy-status.json        │
└──────────────────────────────────────────────────────┘
```

Every user action takes one of three paths:
- **MCP tool call** (`bbuddy_*`) → `src/server/index.ts` → DB + status
  file rewrite → statusline picks up next refresh.
- **Hook event** (SessionStart / Pre/PostToolUse / Stop) → hook
  script reads/patches the status file.
- **Statusline refresh** (every 1 s) → `dist/statusline-wrapper.js`
  reads the status file, detects terminal width, renders side-by-side
  buddy art + info + optional speech bubble.

---

## 3. Data model

SQLite at `~/.bbuddy/bbuddy.db`, schema in `src/db/schema.ts`:

| Table | Purpose |
|---|---|
| `companions` | The active buddy (exactly one row at a time) |
| `custom_sprites` | ASCII frames for `creation_mode = 'created'` companions |
| `companion_slots` | JSON snapshots of saved buddies, keyed by slot name |
| `memories` | Free-form memories attached to a companion |
| `xp_events` | XP history (observe / pet / etc) |
| `evolution_history` | Level/species transitions |
| `sessions` | Session start/end |
| `settings` | Key-value store (currently only `language` = `en`/`ko`) |

Status file at `~/.claude/bbuddy-status.json` mirrors the active
companion + active reaction so the wrapper can render without hitting
the DB. Servers and hooks are the writers; the wrapper is read-only.

### Reaction lifecycle
1. Bash tool about to run → `pre-tool-use.mjs` sets
   `reaction='working'`, `reaction_indicator='⚙'`,
   `reaction_expires=now+15s`.
2. Bash finishes → `post-tool-use.mjs` overrides with
   `excited`/`concerned` + `reaction_text` pulled from a pool.
3. Claude response ends → `stop.mjs` scans the transcript for
   `<!-- bbuddy: text -->` comments and overrides with that text +
   30 s TTL.
4. Wrapper renders the speech bubble (or inline fallback in narrow
   panes) until `reaction_expires`.

---

## 4. Repo layout

```
src/
├── server/index.ts         # MCP server — all 18 tools
├── db/schema.ts            # Tables + initDb()
├── statusline-wrapper.ts   # The statusline renderer (runs every 1s)
├── creator/
│   ├── wizard.ts           # bbuddy_create state machine + prompts
│   ├── parts-combiner.ts   # Mode 2 (face+eye+accessory+body)
│   ├── manual-input.ts     # Mode 4 (raw ASCII)
│   ├── presets.ts          # 6 personality presets + bio templates
│   └── stats.ts            # 100-pt stat distribution validation
├── i18n/
│   ├── index.ts            # getLang/setLang backed by settings table
│   └── server.ts           # SERVER_STRINGS catalog
└── lib/
    ├── species.ts          # 21 built-in species (SPRITE_BODIES)
    ├── reactions.ts        # Species-specific reaction templates
    ├── leveling.ts         # XP / level curve
    ├── observer.ts         # bbuddy_observe orchestration
    └── types.ts            # Shared types, stats, presets, rarities

hooks/
├── session-start.mjs       # Injects companion context into Claude's system prompt
├── pre-tool-use.mjs        # Bash working reaction
├── post-tool-use.mjs       # Success/failure reaction
├── stop.mjs                # Scans <!-- bbuddy: --> comments
└── codex-*.mjs             # Codex CLI equivalents (limited on Windows)

skills/                     # Slash command definitions
├── create / hatch / pet / evolve / observe / remember
├── save / list / summon / dismiss    # slot ops
├── language                           # /bbuddy:language
├── mute / unmute / rename / respawn
└── show / stats

.claude-plugin/plugin.json   # Claude Code plugin manifest
.codex-plugin/plugin.json    # Codex CLI plugin manifest
install.sh, install.ps1      # One-shot installers
```

---

## 5. MCP tool inventory (18)

| Tool | Purpose |
|---|---|
| `bbuddy_hatch` | Random species roll |
| `bbuddy_create` | 4-step wizard (name → appearance → personality → stats) |
| `bbuddy_status` | Render the companion card |
| `bbuddy_respawn` | Permanently delete the active companion |
| `bbuddy_evolve` | Change appearance (same 4 modes as create) |
| `bbuddy_pet` | Heart animation + happy reaction |
| `bbuddy_observe` | **Explicit-only.** Full speech-bubble + XP reaction card. |
| `bbuddy_remember` | Add a memory |
| `bbuddy_dream` | Memory consolidation |
| `bbuddy_mute` / `bbuddy_unmute` | Silence / unsilence ambient reactions |
| `bbuddy_save` / `bbuddy_list` / `bbuddy_summon` / `bbuddy_dismiss` | Slot ops |
| `bbuddy_language` | Set / show UI language (en / ko) |

The **14th tool**, `bbuddy_observe`, is not supposed to fire on every
response. The Stop hook + `<!-- bbuddy: text -->` comment pipeline is
the token-cheap path for ambient reactions (~15 tokens vs ~200). Only
call `bbuddy_observe` when the user explicitly asks for a reaction.

---

## 6. Conventions & rules

### Naming
- The project name is **`bbuddy`** (two b's, no d). Never `bbddy`,
  `buddy`, or `bbuddy-mcp` anywhere in new code.
- Branded strings in Korean or English both stay lowercase `bbuddy`.
- CSS-style db path: `~/.bbuddy/bbuddy.db`.

### Statusline
- The wrapper is **a local Node script** and runs as a subprocess
  every ~1 s. It does **no LLM calls, no network, no tokens**.
- Output must never overflow terminal width — use `visualWidth`
  (in `statusline-wrapper.ts`) for cell math, not `.length`.
- Pad with **Braille Blank (U+2800)**, not regular spaces. Claude
  Code trims leading spaces per line.
- Reserve stable widths for the reaction indicator (3 cells), ambient
  text (24 cells), and anything else that toggles, otherwise the
  buddy visibly wobbles when state changes.
- Dependencies on OMC HUD, claude-hud, or any external plugin are
  **not allowed**. The wrapper renders the buddy. That's it.

### Reactions
- Prefer `<!-- bbuddy: {max 15 chars} -->` at end of response.
- Never auto-call `bbuddy_observe` — only when the user literally
  asks (`/bbuddy:observe`, "what does my buddy think?", etc).
- Respect muted state (`mood === 'muted'` → no reactions).

### i18n
- English is the default. Korean is opt-in via `bbuddy_language`.
- UI strings go through the catalogs in `src/i18n/server.ts` and the
  per-file catalogs in `creator/wizard.ts` / `creator/presets.ts`.
- **Bio templates and observer tone prompts stay English-only.** They
  feed the LLM's system prompt and the English wording is what's been
  tuned for the reaction pipeline.

### Codex CLI
- Windows native Codex hooks are **broken upstream** — the codex.exe
  hook pipe fails whenever a hook writes stdout/stderr, which kills
  both session-context injection and stop-time reactions. Do not
  remove the hook files; they still run silently and the Codex team
  is working on the parser. Just don't assume they work on Windows.

---

## 7. Development history (phase-by-phase)

### Pre-fork (fiorastudio/buddy, commits before `0277f22`)
- Original `buddy` project: 18 species, MCP server, basic statusline.
- Alpha milestones P1-1 through P1-8 all closed upstream.

### Phase 1 — rename + creator MVP (`0277f22`)
- `buddy` → `bbddy` rebrand (later renamed again to `bbuddy`).
- New DB path, extended `companions` columns for `creation_mode`,
  `personality_preset`, `stats_json`.
- First stab at `bbddy_create` wizard.

### Phase 2 — appearance creator (`42a7547`)
- Parts combiner (mode 2), AI generator (mode 3 — later reworked),
  manual input (mode 4).
- `custom_sprites` table, `generatePresetBio`, 6 personality presets,
  100-pt stat distribution.

### Phase 3 — hooks, skills, plugin manifest (`0cdaa5b`)
- `hooks/session-start.mjs`, `stop.mjs`, `pre-tool-use.mjs`,
  `post-tool-use.mjs`.
- `<!-- bbuddy: ... -->` reaction pipeline.
- Skills (`/bbuddy:*` slash commands).
- `.claude-plugin/plugin.json`.

### Phase 4 — Codex CLI extension (`ce0e1d8`)
- `codex-session-start.mjs`, `codex-stop.mjs`.
- Stdout sprite renderer for Codex.
- `.codex-plugin/plugin.json`.
- **Known broken on Windows** (see conventions).

### Post-Phase 4 stabilization session (current — 2026-04-13)
Over a single long session the codebase got a structural overhaul.
Each bullet is one commit:

1. `fix(creator)`: normalize literal `\n` escapes in manual frame
   input so Korean descriptions survive the MCP round trip.
2. `fix(server)`: preserve `custom_idle_frames` across every status
   write — previously slot ops and pet calls stripped the sprite.
3. `refactor(statusline)`: drop the DB fallback in the wrapper now
   that the server always writes frames correctly.
4. `feat(creator)`: AI ASCII generation (mode 3) delegates to the
   host LLM instead of calling the Anthropic API directly — no
   `ANTHROPIC_API_KEY` required.
5. A multi-commit storm of statusline experiments — right-align →
   auto-detect terminal width → Braille Blank padding → drop-HUD
   mode for narrow panes → reverts → reapply. Ended up with:
   - Terminal width auto-detection via WezTerm, tmux, kitty,
     Unix stty, or `COLUMNS`. Cached for 1 second.
   - Braille Blank padding.
   - Frame animation stabilized with time buckets instead of fresh
     `Math.random()` per render.
   - Claude Code UI reservation (10 cells by default).
   - Buddy-only mode when the terminal is too narrow for both HUD
     and buddy.
6. `feat(slots)`: `bbuddy_save / list / summon / dismiss` + auto
   `__previous` backup.
7. `feat(i18n)`: bilingual UI with English default.
   Catalogs in `src/i18n/` and local catalogs in wizard / presets.
8. `refactor`: **bbddy → bbuddy** rename (466 replacements across
   36 files).
9. `chore`: expand `.gitignore` to keep `.omc/`, `.claude/`,
   `codex-hook-probe/`, `bbuddy-design-spec-v2.md`, etc out.
10. `feat(statusline)`: drop claude-hud / OMC HUD dependency.
11. `revert`: **remove the inline HUD** — the wrapper renders buddy
    only, nothing else.
12. `fix(statusline)`: stabilize buddy anchor across reaction state
    changes (3 separate causes: ambient show/hide, ambient length
    rotation, indicator width).
13. `fix(statusline)`: drop the speech bubble when the terminal is
    too narrow (< ~65 cells) and inline the reaction text into the
    line-3 slot so the anchor never wobbles.
14. `docs(tools)`: rewrote the `bbuddy_observe` description so the
    LLM stops auto-calling it on every turn — the `<!-- bbuddy: -->`
    comment pipeline is cheaper.

---

## 8. Current state snapshot (2026-04-13)

- **Build**: passes.
- **Tests**: 295 / 295 (vitest).
- **Locale**: English default, Korean opt-in.
- **Statusline**: zero plugin dependencies, renders buddy only.
- **Reaction pipeline**: `<!-- bbuddy: -->` via Stop hook is the
  ambient path; `bbuddy_observe` is explicit-only.
- **Slot system**: save / list / summon / dismiss working, with
  `__previous` auto-backup.
- **Known gaps**: Windows Codex hook pipe is upstream-broken. The
  legacy `STATUS.md` / `TODO.md` still reference the pre-fork
  `fiorastudio/buddy` state and need rewriting.
- **Package name**: `bbuddy@0.1.0`.

---

## 9. Pending work

Short-term (before publish):
- [ ] Update `install.sh` / `install.ps1` to wire
  `statusLine.refreshInterval = 1` and `padding = 1` automatically.
- [ ] Rewrite `STATUS.md` and `TODO.md` so they describe bbuddy,
  not fiorastudio/buddy.
- [ ] Update `README.md` for all the post-Phase-4 changes (rename,
  slots, i18n, stabilized statusline, OMC removal).
- [ ] Document the Windows Codex hook limitation somewhere visible.

Medium-term (Beta roadmap, inherited from the original project):
- [ ] Implement the "Shiny" variant ASCII + rarity visual polish.
- [ ] Expand the species library past 21.
- [ ] Richer evolution mutations (cross-species traits, mega
  evolutions).
- [ ] IDE-side install scripts (VSCode / Cursor register the MCP
  server automatically).

---

## 10. How to run / test / deploy locally

```bash
cd <repo>
npm install
npm run build
npm test                    # vitest, should show 295/295

# Deploy to your local install dir so Claude Code picks it up
cp -r dist/* ~/.bbuddy/server/dist/
cp hooks/*.mjs ~/.bbuddy/hooks/
# Restart Claude Code to reload the MCP server process.
```

The statusline wrapper is refreshed on every Claude Code tick — you
don't have to restart for wrapper-only changes, just redeploy the
file.

---

## 11. For AI contributors specifically

- **Always update this file when you change architecture or
  conventions.** If you don't, the next session's agent will make
  the same mistakes again.
- **Don't re-enable the inline HUD.** The wrapper is buddy-only by
  design. Users who want a HUD run it separately.
- **Don't auto-call `bbuddy_observe`.** It exists for explicit user
  requests. The ambient path is `<!-- bbuddy: ... -->`.
- **Don't assume Misc Symbols (0x2600–0x26FF) are 2 cells** — most
  terminals render them as 1 cell. Adding them to `visualWidth` will
  re-introduce the anchor wobble.
- **Don't remove `~/.bbuddy/stacked-statusline.mjs`** expectations
  from local setups. The repo ships buddy-only. Users can point
  their `statusLine.command` at their own wrapper if they want to
  layer things.
