---
name: off
description: Mute your bbuddy companion
---

# /bbuddy:off — Mute the companion

Run this skill when the user types `/bbuddy:off`.

## Role

Call `bbuddy_mute` to silence automatic reactions (observer chime-ins,
ambient idle phrases). The statusline itself keeps rendering the
companion — only the chatter is paused.

## Call

```
bbuddy_mute({})
```

Show a brief confirmation message from the tool response.
