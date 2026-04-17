---
name: show
description: Show your bbuddy companion's status card
---

# /bbuddy:show — Display the companion card

Run this skill when the user types `/bbuddy:show`.

## Role

Call the `bbuddy_status` MCP tool to display the current companion's
status card (ASCII, level, mood, stats, personality).

## Call

```
bbuddy_status({})
```

Relay the response verbatim — just print the card, no extra commentary.
