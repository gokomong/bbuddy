---
name: evolve
description: Change your bbuddy companion's appearance
---

# /bbuddy:evolve — Change the companion's appearance

Run this skill when the user types `/bbuddy:evolve`.

## Role

Step through `bbuddy_evolve` to replace the companion's sprite while
keeping name, personality, level, XP, and stats intact.

## Flow

1. Call `bbuddy_status({})` to confirm the current companion exists.
2. Surface the appearance modes:
   - `2` parts mix (face / eye / accessory / body)
   - `3` AI generate (prompt the host LLM to draw new frames)
   - `4` manual (user types the ASCII directly)
3. Collect the mode-specific parameters from the user.
4. Call `bbuddy_evolve({ appearance_mode: "...", ..., confirm: true })`.

## Examples

```
// Parts mix
bbuddy_evolve({
  appearance_mode: "2",
  parts: { face: "square", eye: "♥", accessory: "crown", body: "arms" },
  confirm: true,
})

// AI regeneration
bbuddy_evolve({
  appearance_mode: "3",
  ai_prompt: "robot wizard",
  confirm: true,
})
```

After the tool confirms, call `bbuddy_status({})` once more to show the
updated card.
