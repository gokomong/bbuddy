---
name: rename
description: Rename your bbuddy companion
---

# /bbuddy:rename — Rename the companion

Run this skill when the user types `/bbuddy:rename`.

## Role

bbuddy has no dedicated rename tool. The supported path is to capture
the current companion into a slot, respawn, and recreate under the new
name with the same personality and stats preserved from the snapshot.

## Flow

1. `bbuddy_status({})` to confirm the current name and stats.
2. Ask the user for the new name.
3. Inform the user that renaming requires recreating the companion;
   confirm they want to proceed. If they agree:
   - `bbuddy_save({ slot: "__rename_backup" })` to snapshot.
   - `bbuddy_respawn({ confirm: true })` to clear the active companion.
   - `bbuddy_create({ ..., name: "<new>", ..., confirm: true })` using
     the same personality preset and stat distribution from step 1.
4. Show the new card with `bbuddy_status({})`.

If the user just wants a cosmetic nickname shown in the statusline,
propose `bbuddy_evolve` with the same parts — that doesn't rename but
often scratches the same itch.
