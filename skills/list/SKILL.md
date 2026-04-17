---
name: list
description: List all saved bbuddy slots
---

# /bbuddy:list — List saved slots

Run this skill when the user types `/bbuddy:list`.

## Role

Call `bbuddy_list` to enumerate every saved slot with its slot name,
companion name, species, level, and saved-at timestamp. The `__previous`
slot is an automatic backup made right before a `bbuddy_summon` — call
that out in your reply so the user knows where last-swap undo lives.

## Call

```
bbuddy_list({})
```

If the list is empty, surface the empty-state message from the tool and
suggest `bbuddy_save` / `/bbuddy:save <slot>` as the entry point.
