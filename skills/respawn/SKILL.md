---
name: respawn
description: Permanently release the current bbuddy companion
---

# /bbuddy:respawn — Release the current companion

Run this skill when the user types `/bbuddy:respawn`.

## Role

Permanently delete the active companion and all of its XP, memories,
and evolution history. After respawn, the user is back to the "no
companion" state and can `/bbuddy:hatch` or `/bbuddy:create` again.

**This is destructive.** Confirm intent with the user first. If they
want to keep the companion around for later, suggest `/bbuddy:save
<slot>` before respawning.

## Call

```
bbuddy_respawn({ confirm: true })
```

Without `confirm: true` the tool returns instructions rather than
deleting — surface that text verbatim.
