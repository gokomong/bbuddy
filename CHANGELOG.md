# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
aims at [Semantic Versioning](https://semver.org/).

## [Unreleased]

_Nothing yet._

## [0.1.0] - 2026-04-17

First tagged release. Six phases of fork work plus the public-
readiness sprint (migration safety, marketplace plugin manifests,
npm metadata, CI, CHANGELOG/CONTRIBUTING/CODE_OF_CONDUCT/SECURITY,
skill translation, coverage tooling, Bun support) all land under
this tag.

### Public-readiness sprint (2026-04-17)

- **Added** — legacy path migration from `~/.bbddy/bbddy.db` and
  `~/.buddy/buddy.db` → `~/.bbuddy/bbuddy.db`, plus
  `~/.claude/bbddy-status.json` → `bbuddy-status.json`. Runs on MCP
  server init and inside the SessionStart hook. 6 new migration tests.
- **Added** — `.claude-plugin/.mcp.json` and `.codex-plugin/.mcp.json`
  with `${CLAUDE_PLUGIN_ROOT}` / `${CODEX_PLUGIN_ROOT}` so
  marketplace installs wire the MCP server without `install.sh`.
- **Added** — full `package.json` metadata (`keywords`, `author`,
  `homepage`, `repository`, `bugs`, `engines` for Node ≥20 and Bun
  ≥1.0.0).
- **Added** — GitHub Actions test matrix (Node 20 / 22), issue
  templates, PR template, coverage tooling
  (`@vitest/coverage-v8` + `npm run test:coverage`).
- **Added** — English SKILL.md for every slash command plus new skill
  docs for `hatch`, `respawn`, `observe`, `remember`, `dream`.
- **Added** — `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `CHANGELOG.md`, README Credits section, README status badges,
  HANDOFF maintainer-diary banner.
- **Added** — `install.sh` / `install.ps1` detect Bun and prefer it,
  falling back to npm if native rebuild fails.
- **Fixed** — `npm audit` clean: resolved HIGH (`basic-ftp`) and
  MODERATE (`hono`) transitive vulnerabilities.
- **Fixed** — README install section no longer points at the
  non-existent `statusLineCmd` settings.json field; now documents
  the `CLAUDE_CODE_STATUSLINE_CMD` env-var approach.
- **Changed** — MCP tool reference in README updated with Phase 5
  tools (`bbuddy_save / list / summon / dismiss / language`) and
  matching slash commands.
- **Changed** — `STATUS.md` and `TODO.md` rewritten for bbuddy; the
  upstream Alpha `P1-1..P1-8` / Nuzzlecap checklist is gone.

### Fork history (condensed from AGENTS.md §7)

#### Added
- **Phase 1 — rename + creator MVP** (`0277f22`): rebrand
  `fiorastudio/buddy` → `bbddy` (later `bbuddy`), extended `companions`
  schema with `creation_mode`, `personality_preset`, `custom_prompt`,
  `stats_mode`, `rarity`, `eye`, `hat`, `stats_json`. First
  `bbuddy_create` stub with species selection.
- **Phase 2 — appearance creator** (`42a7547`): 4-mode wizard
  (species / parts / AI delegate / manual ASCII), `custom_sprites`
  table, six personality presets, 100-pt stat distribution,
  `generatePresetBio` templating, `bbuddy_evolve` tool.
- **Phase 3 — Claude Code integration** (`0cdaa5b`): SessionStart,
  Stop, PreToolUse, PostToolUse hooks; `<!-- bbuddy: -->` reaction
  comment pipeline; 11 `/bbuddy:*` slash commands; plugin manifest.
- **Phase 4 — Codex CLI extension** (`ce0e1d8`): Codex-specific hooks
  with ANSI sprite rendering to stdout, `.codex-plugin/plugin.json`.
  Windows native Codex hook stdout is broken upstream — documented
  but not worked around on this side.
- **Phase 5 — stabilization** (April 12–13):
  - Slots: `bbuddy_save`, `bbuddy_list`, `bbuddy_summon`,
    `bbuddy_dismiss`, with automatic `__previous` backup on summon.
  - i18n: English default with Korean opt-in via `bbuddy_language`.
  - Speech-bubble rendering with CJK-aware `visualWidth`.
  - Stable statusline anchor across reaction/ambient state changes
    (`INDICATOR_WIDTH=3`, `AMBIENT_SLOT_WIDTH=24`).
  - Terminal-width auto-detect (tmux, WezTerm, kitty, stty) with 1 s
    cache TTL; drop-HUD fallback for narrow panes.
  - AI generation (mode 3) delegates to host LLM; no
    `ANTHROPIC_API_KEY` required.
- **Phase 6 — tool-driven wizard card** (2026-04-15): every
  `bbuddy_create` step returns a framed `.______.` card; species
  mode preview now embeds ASCII body via `getSpeciesPreviewFrame`.

#### Changed
- `bbddy` → `bbuddy` rename (466 replacements across 36 files) —
  package name, MCP server, DB path, tool names, slash commands.
- Statusline wrapper is a self-contained Node script with zero HUD
  plugin dependencies. Inline-HUD experiments were reverted.
- `bbuddy_observe` tool description and companion resource URI text
  rewrote to prefer the `<!-- bbuddy: -->` comment pipeline over
  auto-invocation.

#### Fixed
- Literal `\n` in MCP tool call payloads for mode 4 manual frames
  (Korean descriptions triggered this first).
- `custom_idle_frames` now preserved across all `writeBuddyStatus`
  call sites, not just the creation path — buddy no longer vanishes
  after `bbuddy_pet` or `bbuddy_status`.
- Misc Symbols (0x2600–0x26FF) treated as 1 cell in `visualWidth` to
  match terminal rendering; 2-cell mis-classification caused anchor
  drift.
- Speech bubble dropped when terminal is too narrow for both bubble
  and buddy; reaction text moves into the line-3 slot so the anchor
  stays constant.

#### Removed
- Inline-HUD renderer in statusline wrapper — out of scope for the
  companion, reverted after review.
- Statusline wrapper DB fallback; the server now always writes the
  status file correctly.
- Direct Anthropic API usage for mode 3 AI generation;
  `src/creator/ai-generator.ts` deleted.

[Unreleased]: https://github.com/gokomong/bbuddy/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gokomong/bbuddy/releases/tag/v0.1.0
