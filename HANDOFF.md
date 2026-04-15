# bbuddy — Handoff Log

A running narrative of what's been done, what decisions were made,
and what's still open. If `AGENTS.md` is the reference manual, this
is the work diary. Read it to reconstruct *why* the current code
looks the way it does.

Most recent milestones are at the top. Older entries stay at the
bottom so you can scroll back when a commit message references
"the Phase 2 design decision" or "the pre-rename DB path".

---

## 📍 Current position

- **Branch**: `master`
- **Head**: `4e0494a` (`docs: add AGENTS.md and CLAUDE.md`) + uncommitted
  wizard-card work (see Session 6 below)
- **Build**: ✅ passes (`npm run build`)
- **Tests**: ✅ 309 / 309 (`npm test`)
- **Deployed locally**: `~/.bbuddy/server/dist/` + `~/.bbuddy/hooks/`
- **Package name**: `bbuddy@0.1.0`
- **Language default**: `en` (Korean opt-in via `/bbuddy:language ko`)
- **Active companion in test env**: `또치` (Custom, tsundere, Lv.1)

---

## 🗺️ Timeline

### Pre-fork era (upstream `fiorastudio/buddy`)
Alpha phases P1-1 through P1-8 were closed by the original author
before we forked. The fork starts at commit `0277f22` where the
project was renamed `buddy` → `bbddy`.

### Phase 1 — rename + creator MVP (`0277f22`)
Initial fork. Renamed everything, extended the `companions` schema
with the columns the creator wizard needs (`creation_mode`,
`personality_preset`, `stats_json`, etc.). First stab at
`bbddy_create`, supporting only mode 1 (species pick).

### Phase 2 — appearance creator (`42a7547`)
Real wizard with four appearance modes:

| Mode | How | Code |
|---|---|---|
| 1 | Pick from the 21 built-in species | `src/lib/species.ts` |
| 2 | Combine face + eye + accessory + body parts | `src/creator/parts-combiner.ts` |
| 3 | AI-generate from a description | at the time: `ai-generator.ts` calling Anthropic API directly |
| 4 | Type the ASCII yourself | `src/creator/manual-input.ts` |

Added `custom_sprites` table, six personality presets, 100-pt stat
distribution, and `generatePresetBio()` that fills a template with
peak/dump stat names.

### Phase 3 — Claude Code integration (`0cdaa5b`)
- Hooks: `session-start`, `pre-tool-use`, `post-tool-use`, `stop`.
- `<!-- bbddy: ... -->` reaction comment pipeline (Stop hook scans
  the transcript and writes the text to `bbddy-status.json`).
- Skills: 12 slash commands (`/bbddy:create`, `:pet`, `:evolve`,
  `:respawn`, etc).
- Plugin manifest `.claude-plugin/plugin.json`.

### Phase 4 — Codex CLI extension (`ce0e1d8`)
- `hooks/codex-session-start.mjs`, `hooks/codex-stop.mjs`.
- Stdout sprite renderer for Codex.
- `.codex-plugin/plugin.json`.
- **Known issue**: Windows native Codex refuses any stdout/stderr
  from a hook. Documented in AGENTS.md §6. Linux / macOS / WSL are
  fine.

### Phase 5 — stabilization (2026-04-12 → 2026-04-13)
This is where most of the mess happened. The session started with a
bug-hunt and turned into a half-rewrite. Timeline below.

### Phase 6 — tool-driven wizard card (2026-04-15)
The create flow was half tool, half LLM-scripted conversation: the
skill markdown told the LLM to ask the four questions itself, and
the tool's preview card didn't render any ASCII in species mode.
This phase makes `bbuddy_create` the single source of truth for the
UI. See Session 6 below.

---

## 🧭 Session 5 work log (2026-04-12 → 2026-04-13)

Each entry is one commit in chronological order, oldest first. The
"why" column is the reason the commit exists — the context that
doesn't fit into a commit message.

### Part A — core bug fixes

| Commit | What | Why |
|---|---|---|
| `4308a39` | `fix(creator)` — normalize literal `\n` in `parseFrame` | Mode 4 manual input was collapsing to one truncated row whenever the MCP tool call arrived with `\n` as a literal 2-char escape instead of a real newline. Showed up first when creating 또치 with a Korean prompt. |
| `192f6c0` | `fix(server)` — preserve `custom_idle_frames` on every status write | `writeBuddyStatus()` was only writing custom sprite frames when the caller passed `companionId`. Most of the 8 call sites didn't, so any `bbddy_pet` / `bbddy_status` call after creation would wipe the sprite out of the status file. The buddy visibly disappeared from the statusline. |
| `b5dd3d5` | `refactor(statusline)` — drop DB fallback | Once the server writes frames correctly, the wrapper's DB-read fallback is dead code. Removed it. |
| `3a6be1e` | `feat(creator)` — AI generation delegates to the host LLM | Mode 3 used to `fetch()` the Anthropic API directly with `ANTHROPIC_API_KEY`. Wasteful: bbddy already runs inside Claude Code or Codex, which IS a capable model. Now the server returns a structured "please draw me these frames and call me back" prompt, and the host LLM fills it in. `ai-generator.ts` deleted. |

### Part B — the statusline saga

The right-aligned statusline took ~12 commits to land because the
constraints kept fighting each other:

1. `74c1dd3` — first right-align attempt. Used `process.stdout.columns`
   which is `undefined` when Claude Code spawns the wrapper as a
   subprocess. Fell back to 180. Too wide for real terminals → wrapped.
2. `cf6d349` — tried to auto-detect terminal width via PowerShell
   `$Host.UI.RawUI.WindowSize.Width`. Added Braille Blank (U+2800)
   padding so Claude Code's per-line `trimStart()` wouldn't eat the
   alignment. Problem: PowerShell in a detached subprocess reports
   its own default console size (120), not the parent terminal's.
3. `bc6bd94` — gave up on right-align, went back to close-to-HUD.
4. `1e125a3` / `295f602` / `8eb9fee` — reverts.
5. `2964246` — re-implemented right-align with a 25-column reserve.
   Still wrong on resize because detection was unreliable.
6. `c68dcbe` — tweaked margin to 3.
7. `3e04ff3` — **the real fix**. Terminal width detection via
   emulator-specific CLIs: `tmux display -p '#{pane_width}'`,
   `wezterm cli list --format json` (look up our pane via
   `$WEZTERM_PANE`), `kitten @ ls` for kitty, `stty size < /dev/tty`
   on Unix. Cached in `~/.claude/bbuddy-term-cols.json` with a 1 s
   TTL so resize is reflected within 1 s.
8. `402468b` — when the pane is too narrow for both HUD and buddy,
   drop the HUD entirely and right-align just the buddy.
9. `90bcde1` — Claude Code reserves ~10 cells inside the terminal for
   its own UI chrome (panel border, prompt margin). The raw pane
   width isn't the usable statusline width. Subtract
   `CLAUDE_RESERVATION` (default 10, override with
   `BBUDDY_CLAUDE_RESERVATION`).
10. `5ba10c3` — `refreshInterval: 1` made `Math.random()` in the
    frame selector strobe aggressively. Switched to time-bucket
    hashes: 2.5 s for frame selection, 4 s for micro-particle,
    15 s for ambient text. Still feels organic, doesn't flicker.

### Part C — slots + i18n + bubble

| Commit | What | Why |
|---|---|---|
| `c6b2bd6` | `feat(slots)` — save / list / summon / dismiss | Users wanted to keep multiple buddies on hand and swap between them without losing each other. New `companion_slots` table. `bbddy_summon` auto-backs up the current companion to an internal `__previous` slot so every swap is reversible. |
| `26f01f6` | `feat(statusline)` — real ASCII speech bubble | The old inline `"quoted reaction"` next to the mood line was too subtle. Ported claude-buddy's bubble box: word-wraps the reaction text into a 28-col inner box, draws `.---.` / `` `---' `` borders, places a `--` connector on the middle text row pointing at the buddy's mouth. |
| `a913c1c` | `fix(statusline)` — CJK visual width for bubble padding | Korean characters are 2 cells visual but 1 char in `.length`. Bubble right border drifted left whenever the reaction had Hangul. Added `visualWidth()`. Emoji and fullwidth ranges go to 2 cells too. |
| `50015ac` | `feat(i18n)` — bilingual UI, English default | Hardcoded Korean wizard prompts / error messages / preset labels blocked non-Korean users. Built a two-layer i18n system: a global `settings.language` key read by `getLang()`, inline catalogs in `wizard.ts` / `presets.ts`, and `src/i18n/server.ts` for the server response catalog. New `bbddy_language` tool + `/bbddy:language` slash command. Bio templates and observer-tone prompts stay English-only because they feed the LLM. |

### Part D — rename + gitignore + HUD cleanup

| Commit | What | Why |
|---|---|---|
| `66c7642` | `refactor` — **bbddy → bbuddy** | The published name read like a typo. Global rename (466 replacements across 36 files). Covered package name, MCP server name, every `bbddy_*` tool, slash commands, DB/status paths, env vars, hook paths, install scripts, plugin manifests, skill descriptions. Used a one-shot Node script (`.scratch-rename.mjs`), verified 295/295 tests still pass. Fresh install only — no migration from old `~/.bbddy/` directory. |
| `8f4b22f` | `feat(statusline)` — drop claude-hud / OMC HUD dependency, inline HUD | Previously the wrapper tried to shell out to OMC HUD or claude-hud for the left side of the statusline. Users who didn't have either saw an empty left half. Replaced the plugin lookup with `buildInlineHud()` that parses Claude Code's own stdin JSON payload (model, ctx%, session duration, 5h rate limit). |
| `4a93b2a` | `chore` — expand `.gitignore` | The starter `.gitignore` only covered `node_modules`, `dist`, `*.db`, `.env`. The repo was collecting `.claude/`, `.omc/`, `.codex-hook-*.stdin.json`, `codex-hook-probe/`, `codex-monorepo-local/`, and a private design spec. Added exclusions for all of those plus editor / OS files. |
| `de1c169` | `revert(statusline)` — remove inline HUD, buddy-only again | The user pushed back: the inline HUD wasn't part of the original design intent. The wrapper should render the companion, period. Removed `buildInlineHud()`, kept the layout math. If users want a HUD, they run it as a separate statusline command. |

### Part E — anchor stability + token pass

| Commit | What | Why |
|---|---|---|
| `d4dc255` | `fix(statusline)` — stabilize anchor across reaction states | The buddy visibly jumped 1-3 cells left/right whenever the Pre/PostToolUse hooks toggled the reaction indicator. Three causes stacked:  (1) hiding ambient while reaction was active shrunk line 3, (2) rotating ambient phrases of different lengths moved the anchor, (3) different indicators had different widths. Fix: fixed `INDICATOR_WIDTH = 3` slot, fixed `AMBIENT_SLOT_WIDTH = 24` slot, ambient only hides when a real bubble renders. Also switched width math from `.length` to `visualWidth()`. |
| `04176e9` | `fix(statusline)` — bubble narrow-pane fallback | In narrow panes, enabling the ~35-cell bubble pulled `maxBuddyWidth` way up and shifted the anchor. Now: if the usable width can't fit bubble + buddy, drop the bubble entirely and put the reaction text into the line-3 slot (replacing the ambient phrase) so width stays constant. |
| `463ce16` | `docs(tools)` — stop auto-calling `bbuddy_observe` | The old `bbuddy_observe` description told the LLM to call it on every coding task. Each call returned a multi-line speech bubble card plus XP info (~200 response tokens). Rewrote the description AND the companion resource URI text so the LLM uses the `<!-- bbuddy: {max 15 chars} -->` comment pipeline by default (~15 tokens) and only calls `bbuddy_observe` when the user explicitly asks for a reaction. Also renamed the personal `run-codex-bbddy.ps1` helper to `run-codex-bbuddy.ps1`. |
| `4e0494a` | `docs` — add `AGENTS.md` + `CLAUDE.md` | Project context files for humans and agents. AGENTS.md is the canonical reference; CLAUDE.md is a shorter Claude-Code brief that points at it. Both should be updated in the same commit as any architectural change. |

---

## 🧭 Session 6 work log (2026-04-15)

Tool-driven wizard card redesign. The `/bbuddy:create` experience
was inconsistent: the skill markdown said "guide the user through
these steps" so the LLM would ask questions in its own voice, and
the preview card only showed ASCII for parts/AI/manual modes —
species mode left the sprite area blank. Users saw a plain-text
conversation instead of a polished wizard.

| What | Why |
|---|---|
| `feat(species)` — `getSpeciesPreviewFrame(species, eye)` helper in `src/lib/species.ts` | Needed a one-liner the server handler could call to get the first adult frame of a species with `{E}` already substituted, as a `string[]`. Falls through to `undefined` for unknown species so the preview renderer can skip the sprite section cleanly. |
| `feat(creator)` — shared card shell in `wizard.ts` | Extracted `CARD_WIDTH=48`, `drawCard()`, `ln()` helpers and rebuilt `renderWizardPrompt` to use them. Every step — name, appearance_mode, species grid, parts, ai_prompt, manual, personality, stats — now renders inside the same `.______.` frame that `renderPreviewText` uses. Progress dots (`● ◉ ○ ○`) on a dedicated row, accumulated state below, choices in the body, and a `→ param: "..."` hint line at the bottom so the LLM knows exactly which field to set on the next call. Species list is a 2-column grid (22 chars wide) so all 21 fit without wrapping past the frame. |
| `feat(creator)` — species frame in mode-1 preview | `src/server/index.ts` `bbuddy_create` handler now falls back from `customSprite?.idleFrames[0]` to `getSpeciesPreviewFrame(speciesForDb)` when `appearance_mode === '1'`. Mode 2/3/4 keep the custom sprite path unchanged. |
| `docs(skill)` — rewrite `skills/create/SKILL.md` | Old version had a "흐름" section listing the four steps and told the LLM to ask them conversationally. New version: "the MCP tool IS the wizard — call it immediately, relay the output verbatim in a fenced block, do not add your own questions or choice lists, only add a 1-sentence follow-up hint". Explicit rule for mode 3 (AI delegation): draw the 3 frames, then re-call with `appearance_mode: "4"`. Parameter reference at the bottom as a single code block. |
| `test(creator)` — renderer + frame tests | `src/__tests__/species.test.ts` gets 5 cases for `getSpeciesPreviewFrame` (valid species, default eye substitution, custom eye, unknown species, no `{E}` leakage). `src/__tests__/creator.test.ts` gets 5 cases for `renderWizardPrompt` (frame borders, equal width, species grid, accumulated name, progress dots) and 4 cases for `renderPreviewText` (frame, stat bars, sprite embedding when frame is passed, sprite omission when not). Total test count goes 295 → 309. |
| `chore` — build + deploy | `npm run build` → `cp -r dist/* ~/.bbuddy/server/dist/` → `cp skills/create/SKILL.md ~/.claude/plugins/cache/local/bbddy/0.1.0/skills/create/SKILL.md`. Server side needs a Claude Code restart to reload the MCP child; skill MD is re-read on next slash-command invocation. |

**Not yet committed.** Working tree has the wizard, server handler,
skill markdown, and test files modified. Commit the lot as one
unit (`feat(creator): tool-driven wizard card`) so reviewers can
see the intended-vs-implemented loop in one diff.

**During this session we also noticed** that `~/.bbddy/bbddy.db`
(the legacy pre-rename location) still existed on this machine with
the user's active companion inside it, while `~/.bbuddy/bbuddy.db`
was empty. The statusline wrapper was silently reading from one
path and the MCP server from the other. Fixed in-place by attaching
legacy and copying `companions`, `xp_events`, `custom_sprites`
rows into the new DB via SQL `ATTACH`. This is a one-off personal
data patch — **not** a migration in code. See Known gotchas.

---

## 💡 Decisions worth remembering

These came up enough that a future contributor could easily reverse
them by accident:

1. **No HUD plugin dependency.** The wrapper renders buddy only.
   Users who want a HUD can layer one themselves.
2. **No auto-call `bbuddy_observe`.** The LLM should prefer the
   `<!-- bbuddy: -->` comment pipeline. Explicit tool use only on
   user request.
3. **English default for all user-facing strings.** Korean is
   opt-in. Bio templates and observer-tone prompts stay English —
   they feed the LLM, not the human.
4. **Misc Symbols (0x2600–0x26FF) are 1 cell.** Do not add them to
   the 2-cell table in `visualWidth()`. Most modern terminals
   (WezTerm included) render them as 1 cell; counting them as 2
   introduces a 1-column anchor drift.
5. **Pad with Braille Blank (U+2800), not spaces.** Claude Code
   `trimStart()`s each statusline row and normal spaces get eaten.
6. **Fresh rename, no migration from `~/.bbddy/`.** Users on the
   old layout must re-install. The project hasn't hit a real
   release yet so this is acceptable.
7. **Terminal width cache TTL = 1 s.** Short enough that resize
   reflects within a second, long enough that the ~180 ms WezTerm
   CLI call doesn't dominate render time.

---

## ⚠️ Known gotchas

| Gotcha | Where | Mitigation |
|---|---|---|
| Windows native Codex hooks refuse any stdout/stderr | `codex.exe` | Hooks installed but produce no visible output; wait for upstream fix. Use WSL for Codex integration. |
| Old MCP server process keeps running until Claude Code restart | any server-side change | Deploy the new build to `~/.bbuddy/server/dist/` AND restart Claude Code. Wrapper changes are hot-reloaded automatically; server / hook changes are not. |
| `hooks/codex-*.mjs` intentionally silent | `hooks/codex-session-start.mjs`, `hooks/codex-stop.mjs` | Don't "fix" them by adding console.log — that re-triggers the Codex hook pipe bug. |
| `run-codex-bbuddy.ps1` still contains a `bbddy-status` string | local helper | Codex CLI's own rename is in progress upstream. Leave the string for now, sync when Codex releases the matching update. |
| The `Plugin` folder has old `.claude/commands/bbddy-*.md` files | `.claude/commands/` | That directory is per-user Claude Code state and is `.gitignore`d. The canonical slash commands live in `skills/`. |
| Pre-rename installs leave `~/.bbddy/bbddy.db` behind | upgrade from a pre-`66c7642` layout | No code migration. A user who created a companion before the rename still has their data at the old path while the new MCP reads `~/.bbuddy/bbuddy.db`. Manual fix: `ATTACH` the old DB and copy `companions` / `xp_events` / `custom_sprites` rows into the new one (schemas match). If distributing, document this in install notes. |

---

## 📝 Open work (ordered by priority)

### Publish-readiness

- [ ] Update `install.sh` / `install.ps1` so fresh installs get
      `statusLine.refreshInterval = 1` and `statusLine.padding = 1`
      without the user touching settings.json.
- [ ] Rewrite `STATUS.md` — it still describes the pre-fork
      `fiorastudio/buddy` Alpha state with Nuzzlecap references.
- [ ] Rewrite `TODO.md` — same issue, references the original
      project phases instead of the current bbuddy roadmap.
- [ ] Refresh `README.md` — add slots, i18n, terminal auto-detect,
      speech bubble, AI delegation, the Windows-Codex limitation.
- [ ] Add a visible note to the README about Windows native Codex
      hooks not working.

### Beta roadmap (inherited from upstream TODO)

- [ ] "Shiny" ASCII variants — rarer sprites with color/particle
      effects.
- [ ] Expand species library past 21 (goal: 50+).
- [ ] Richer evolution mutations — cross-species traits, mega
      evolution events.
- [ ] IDE-side install scripts (VSCode / Cursor register the MCP
      server automatically — with the caveat that those editors
      don't have a statusline API for visual buddies).

### Codex Windows hook fix (nice-to-have, opt-in)

User is investigating whether codex.exe's hook output parser can
be unblocked. If so, the existing `codex-*.mjs` hooks can stop
being silent and the Codex path reaches feature parity with Claude
Code. Tracked separately; no bbuddy-side work until Codex side
lands.

---

## 🧠 How to use this file

- **Before making changes**: read the relevant Timeline section to
  understand the previous attempts and why they look the way they
  do.
- **After landing a non-trivial commit**: add an entry under the
  current session log and, if needed, an entry under "Decisions
  worth remembering" or "Known gotchas".
- **When finishing a session**: update "Current position" and
  move any still-open items into "Open work".
- **Handing off to another contributor**: point them at this file
  and `AGENTS.md`. Together they're the full state of the project.
