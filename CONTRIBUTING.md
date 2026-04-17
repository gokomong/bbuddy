# Contributing to bbuddy

Thanks for considering a contribution. This doc is intentionally short —
the canonical project context lives in [AGENTS.md](./AGENTS.md) and the
session-by-session decision log lives in [HANDOFF.md](./HANDOFF.md). Read
those before opening anything non-trivial.

## Setup

```bash
git clone https://github.com/gokomong/bbuddy.git
cd bbuddy
npm install
npm run build
npm test
```

`better-sqlite3` builds a native module, so you need a working C/C++
toolchain. On Windows install the
[MSVC build tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/);
on macOS `xcode-select --install`; on Linux `build-essential` +
`python3` is typically enough. If `npm install` fails mid-build the
error almost always comes from here.

## Dev loop

- **Statusline changes** — the wrapper re-runs every ~1 s, so edits to
  `src/statusline-wrapper.ts` plus `npm run build` show up live.
- **MCP server / hooks** — the Claude Code (or Codex CLI) process keeps
  the server pinned to the build it launched with. Restart the host
  after each change.
- **Deploy to your own `~/.bbuddy/`** (personal install) —
  `cp -r dist/* ~/.bbuddy/server/dist/`. `install.sh` / `install.ps1`
  handle a fresh install from scratch.

## Conventions

See [AGENTS.md §6](./AGENTS.md). The rules most worth remembering:

1. Default to the `<!-- bbuddy: {≤15 chars} -->` reaction comment, not
   `bbuddy_observe`. The comment pipeline costs ~15 tokens; the tool
   costs ~200 per call.
2. `visualWidth()` for cell math, never `.length` — CJK and fullwidth
   matter.
3. Pad with Braille Blank `U+2800`, not regular spaces. Claude Code
   trims leading spaces per statusline row.
4. Misc Symbols (0x2600–0x26FF) are **1 cell** in `visualWidth`. Don't
   add them to the 2-cell table.
5. English is the default UI language; Korean is opt-in. Bio templates
   and observer-tone prompts stay English-only because they feed the
   LLM's system prompt.
6. No external HUD plugin dependencies in the statusline wrapper.

## Commits

- Conventional Commits: `feat(...)`, `fix(...)`, `docs(...)`,
  `chore(...)`, `refactor(...)`, `test(...)`, `ci(...)`.
- Explain *why*, not *what*. A git reader can read the diff for *what*.
  The commit body should surface the constraint, bug, or design goal
  that justifies the change.
- Do **not** add `Co-Authored-By: Claude` trailers; the maintainer's
  global config forbids them.

## Pull requests

1. `npm run build && npm test && npm audit` all clean before you push.
2. If the repo layout, tool inventory, or conventions change, update
   AGENTS.md in the same PR. HANDOFF.md gets an entry if a future
   session would need the context to make sense of the diff.
3. Fill the PR template. The checklist catches the usual gotchas
   (stale personal paths, skipped test updates, secret leaks).
4. Keep PRs small and scoped to one concern when possible. A bug fix
   and a refactor ride in separate PRs.

## Reporting bugs / asking for features

Use the GitHub issue tracker. Templates live in `.github/ISSUE_TEMPLATE/`.
Include the companion's species, OS, terminal, host (Claude Code /
Codex), Node version, and bbuddy commit. Screenshots of the statusline
save a lot of back-and-forth.

## Security

See [SECURITY.md](./SECURITY.md) — don't file security issues in the
public tracker.
