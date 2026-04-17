# Claude Code — bbuddy project brief

Everything Claude Code needs to know about this repo lives in
[`AGENTS.md`](./AGENTS.md). That file is the canonical project
context and is kept up to date on every structural change. Read it
before editing this project.

## Quick summary (for scanning)

- **What**: a statusline-resident ASCII companion (MCP server + hooks
  + slash commands). Fork of `fiorastudio/buddy`.
- **Name**: `bbuddy`, not `bbddy`, not `buddy`.
- **Runtime**: Node 20+, TypeScript (NodeNext), SQLite via
  `better-sqlite3`, zero external HUD dependencies.
- **Entry points**: `src/server/index.ts` (MCP tools),
  `src/statusline-wrapper.ts` (statusline renderer),
  `hooks/*.mjs` (Claude Code hooks), `skills/` (slash commands).
- **State**: DB at `~/.bbuddy/bbuddy.db`, status file at
  `~/.claude/bbuddy-status.json`.
- **Language**: English is default. `bbuddy_language { lang: "ko" }`
  switches to Korean.
- **Test**: `npm test` → vitest, 295 passing.

## Rules that bite

1. Prefer `<!-- bbuddy: {max 15 chars} -->` comments over calling
   `bbuddy_observe`. The comment costs ~15 tokens; `bbuddy_observe`
   costs ~200 per call.
2. Don't auto-call `bbuddy_observe` after every coding task. Only
   call when the user explicitly asks for a buddy reaction.
3. Don't add HUD-plugin dependencies to the statusline wrapper. The
   wrapper renders buddy only — by design.
4. When changing layout math, use `visualWidth()` for cell counts,
   not `.length`. Pad with Braille Blank (U+2800), not spaces.
5. Keep Misc Symbols (0x2600–0x26FF) OUT of the 2-cell range in
   `visualWidth` — most terminals render them as 1 cell.
6. English strings belong in the catalog in `src/i18n/server.ts`.
   Korean translations live next to them. Bio templates and observer
   tone prompts stay English-only (they feed the LLM directly).
7. `run-codex-bbuddy.ps1` still contains a legacy `bbddy-status`
   string because Codex CLI's own rename is in progress upstream.
   Leave it alone until Codex ships its side.

## Build / test / deploy

```bash
npm install
npm run build
npm test

# Local deploy so Claude Code picks up changes without restart
cp -r dist/* ~/.bbuddy/server/dist/
cp hooks/*.mjs ~/.bbuddy/hooks/
```

The statusline wrapper reloads every ~1 s, so wrapper-only changes
are live immediately. MCP server / hook changes require a Claude
Code restart because those processes are long-lived.

For the full architecture, phase-by-phase history, data model, and
convention details, go to **[`AGENTS.md`](./AGENTS.md)**.
