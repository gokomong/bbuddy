---
name: language
description: Set or view the bbddy UI language (English / Korean)
---

# /bbddy:language — Set the bbddy UI language

Use this skill when the user types `/bbddy:language [en|ko]`.

## Role

bbddy's wizard prompts, error messages, reaction templates, and ambient
idle phrases are localized into English (default) and Korean. Call
`bbddy_language` to read or change the active language.

## Calls

```
bbddy_language({})                 // show current language
bbddy_language({ lang: "en" })     // switch to English
bbddy_language({ lang: "ko" })     // switch to Korean
```

Return the response text verbatim so the user sees the confirmation in
the language they just picked.

## Scope

The setting applies to everything the server generates and the
statusline displays — wizard steps, slot messages, personality preset
labels, pet reactions, ambient idle phrases. It does NOT translate
user-supplied content like custom companion names or reaction comments
from `<!-- bbddy: ... -->` markers.
