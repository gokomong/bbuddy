---
name: observe
description: Have your bbuddy observe a completed coding task and react
---

# /bbuddy:observe — Companion reacts to a task

Run this skill when the user types `/bbuddy:observe` or explicitly asks
"what does my buddy think?".

**Do not invoke this skill automatically after every tool call.** The
lightweight reaction pipeline (the `<!-- bbuddy: {≤15 chars} -->`
comment at the end of an assistant turn) is the default for ambient
reactions. `/bbuddy:observe` is opt-in because it returns a ~200-token
speech-bubble card and awards XP.

## Role

Call `bbuddy_observe` with a short summary of what just happened (a
bug fixed, a feature landed, a refactor completed). The server
generates a personality-weighted reaction, renders it as a speech
bubble, and credits XP.

## Call

```
bbuddy_observe({ task: "<one-sentence summary>" })
```

Relay the speech-bubble card verbatim.
