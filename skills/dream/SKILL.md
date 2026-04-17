---
name: dream
description: Trigger the bbuddy companion's memory-consolidation dream cycle
---

# /bbuddy:dream — Consolidate memories

Run this skill when the user types `/bbuddy:dream`.

## Role

Call `bbuddy_dream` to run one memory-consolidation pass. Recent
memories are summarised, low-importance entries are pruned, and peak
personality traits may drift slightly based on what was saved.

## Call

```
bbuddy_dream({})
```

Relay the dream-summary response verbatim. If no memories exist yet,
surface the tool's empty-state message and suggest `/bbuddy:remember`
as the entry point.
