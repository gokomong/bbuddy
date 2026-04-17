---
name: hatch
description: Hatch a random bbuddy companion
---

# /bbuddy:hatch — Hatch a random companion

Run this skill when the user types `/bbuddy:hatch`.

## Role

Call `bbuddy_hatch` to roll a new companion from the 21 built-in
species. Species, rarity, stats, eye, and hat are deterministic from
the user id — re-running with the same identity returns the same
companion.

Hatch fails if a companion already exists. Ask the user to
`/bbuddy:respawn` first if they want to replace the current one.

## Call

```
bbuddy_hatch({})
```

Relay the returned card verbatim.
