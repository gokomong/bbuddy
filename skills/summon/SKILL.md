---
name: summon
description: Summon a saved bbuddy companion from a slot, replacing the current one
---

# /bbuddy:summon — Summon a saved companion

Run this skill when the user types `/bbuddy:summon <slot>`.

## Role

Restore a companion from the named slot and make it the active one.
Before swapping, the tool automatically backs up the current companion
into the reserved `__previous` slot, so a single mis-summon is never a
permanent loss — `bbuddy_summon({ slot: "__previous" })` reverts it.

## Call

```
bbuddy_summon({ slot: "<user-provided-name>" })
```

If the slot doesn't exist, point the user at `/bbuddy:list` to see what
is available. If the user didn't include a slot name, ask first.

## Notes

- XP, memories, and evolution history for the prior companion stay in
  the DB. The slot stores the companion id, so a later re-summon picks
  up the same history.
- Permanent deletion only happens through `bbuddy_dismiss` or
  `bbuddy_respawn`.
