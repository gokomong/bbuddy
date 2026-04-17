# bbuddy — Project Status

**As of 2026-04-17 · `46f117f..d618eee` on `master`**

## Snapshot

| | |
|---|---|
| Version | `0.1.0` (pre-release) |
| Build | ✅ passes (`npm run build`) |
| Tests | ✅ 315 / 315 (`npm test`) |
| Audit | ✅ 0 vulnerabilities (`npm audit`) |
| License | MIT |
| Node | ≥ 18 |
| Default language | English (Korean via `bbuddy_language ko`) |

## Phase progression

| Phase | What landed | Reference |
|---|---|---|
| **Pre-fork** | Upstream `fiorastudio/buddy` — 21 species, MCP server, basic statusline | [upstream](https://github.com/fiorastudio/buddy) |
| **Phase 1** | Rebrand to `bbuddy`, extended `companions` schema, first `bbuddy_create` stub | AGENTS.md §7 |
| **Phase 2** | 4-mode appearance creator: species / parts / AI delegate / manual ASCII. `custom_sprites` table, 6 personality presets, 100-pt stat distribution | AGENTS.md §7 |
| **Phase 3** | Claude Code hooks, `<!-- bbuddy: -->` reaction pipeline, `/bbuddy:*` slash commands, plugin manifest | AGENTS.md §7 |
| **Phase 4** | Codex CLI extension (hooks + stdout sprite renderer). Windows Codex hook stdout is broken upstream; non-blocker | AGENTS.md §6 "Codex CLI" |
| **Phase 5** | Stabilization: literal-`\n` normalisation, custom_idle_frames preservation, anchor-stable statusline, terminal-width auto-detect, inline-HUD rip-out, slots (save/list/summon/dismiss), bilingual i18n, bbddy → bbuddy rename | HANDOFF.md §"Session 5" |
| **Phase 6** | Tool-driven wizard card: every `bbuddy_create` step returns a framed `.______.` card; species mode preview now embeds the ASCII body | HANDOFF.md §"Session 6" |

## What the project is now

A statusline-resident ASCII companion for Claude Code / Codex CLI, delivered
as an MCP server + hooks + statusline wrapper + slash-command skills. Users
hatch a random companion or build one themselves through a 4-step wizard
(name → appearance → personality → stats). Reactions to coding work flow
through a per-token `<!-- bbuddy: -->` comment pipeline so the runtime cost
is negligible.

See [AGENTS.md](./AGENTS.md) for architecture, tool inventory, conventions,
and the full phase-by-phase history. See [HANDOFF.md](./HANDOFF.md) for the
maintainer's session-by-session work log.

## What's next

Open work lives in [AGENTS.md §9](./AGENTS.md) and in
`GitHub Issues` (once the public repo opens). See [TODO.md](./TODO.md) for a
pointer to the active worklist.
