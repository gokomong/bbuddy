---
name: dismiss
description: Permanently delete a saved bbuddy slot
---

# /bbuddy:dismiss — Delete a saved slot

Run this skill when the user types `/bbuddy:dismiss <slot>`.

## Role

Delete a saved slot forever. The active companion is untouched — only
the slot snapshot is removed. This is irreversible, so confirm intent
with the user before calling the tool.

## Call

```
bbuddy_dismiss({ slot: "<user-provided-name>" })
```

If the slot doesn't exist, surface the tool's not-found message
as-is. If the user didn't include a slot name, ask which one to drop.
