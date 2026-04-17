---
name: remember
description: Save a long-term memory for the bbuddy companion
---

# /bbuddy:remember — Add a memory

Run this skill when the user types `/bbuddy:remember <note>`.

## Role

Persist an arbitrary note into the companion's `memories` table. The
memory can later resurface during `bbuddy_dream` consolidation and may
influence personality drift over many sessions.

## Call

```
bbuddy_remember({ content: "<user-provided note>" })
```

If the user didn't include content, ask what they want to save before
calling the tool. Relay the confirmation response verbatim.
