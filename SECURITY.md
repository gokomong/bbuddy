# Security Policy

## Supported versions

bbuddy is pre-1.0. Security fixes land on `master` and in the next
release tag. There is no back-port branch.

| Version | Supported |
|---|---|
| `0.1.x` | ✅ on `master` |
| older forks | ❌ |

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.** The issue
tracker is world-readable and exploit details are indexed immediately.

Use GitHub's private vulnerability reporting instead:

1. Go to the repository's **Security** tab →
   **Report a vulnerability**.
2. Fill in what you found, how to reproduce, affected versions, and
   the impact (data exfil, RCE, privilege escalation, etc).

If private advisories aren't available for this repo yet, email the
maintainer at the address in the git commit history (`git log
--format='%ae' | head -1`) with `[bbuddy security]` in the subject.

## What to include

- Affected file path and (if known) commit SHA.
- Minimal reproduction — a tool call, a hook payload, or a malformed
  MCP request that triggers the bug.
- What the bug enables. "Arbitrary file read in `~/.bbuddy/`" is very
  different from "statusline renders wrong when \n in name."
- Your preferred disclosure timeline if you have one. Default is
  90 days from acknowledgment.

## What happens next

- Acknowledgment within **72 hours** (weekends pushed to the next
  business day).
- Fix or decision on a ship-date within **14 days**.
- Public disclosure only after a fix is published, unless the issue
  is already public or you withdraw coordination.

## Out of scope

- Issues in upstream dependencies — report those to the upstream
  project. If the issue is in a transitive dep and we can pin a
  different version, we still want to know.
- Social-engineering attacks against the maintainer.
- The known-broken Codex CLI hook behavior on Windows native (upstream
  Codex issue, documented in AGENTS.md §6).
- Anything requiring physical access to the user's machine or
  existing write access to their `~/.bbuddy/` directory.

Thanks for reporting responsibly.
