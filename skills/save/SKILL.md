---
name: save
description: Save the current bbuddy companion to a named slot for later swap
---

# /bbuddy:save — Save the current companion to a slot

Run this skill when the user types `/bbuddy:save <slot>`.

## Role

Snapshot the active companion into a named slot. Re-saving to the same
slot overwrites the previous snapshot. Later, `bbuddy_summon` restores
from a slot.

## Call

```
bbuddy_save({ slot: "<user-provided-name>" })
```

Slot names are 1–24 characters. Names starting with `__` are reserved
for internal bookkeeping and will be rejected.

Relay the response verbatim. If the user didn't include a slot name,
ask for one before calling the tool.
