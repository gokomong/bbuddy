---
name: create
description: Create your own bbuddy companion — name, appearance, personality, stats
---

# /bbuddy:create

The MCP tool `bbuddy_create` IS the wizard. It returns a framed card for
every step. Your job is to pass the user's latest input through and relay
the tool's output verbatim. Do **not** compose your own questions, prompts,
or choice lists — the tool already renders them.

## Rules

1. **First call.** If the user ran `/bbuddy:create` with no arguments, call
   `bbuddy_create({})` immediately. Do not ask anything yourself.
2. **Subsequent calls.** On every user reply, accumulate their inputs into
   the params and re-call `bbuddy_create` with the full set. Never drop a
   previously-set field — the tool is stateless.
3. **Relay.** Whatever text the tool returns, display it verbatim in a
   fenced block. Do not paraphrase, summarise, translate, or add bullets
   around it. The tool's card *is* the UI.
4. **One follow-up sentence max.** After relaying a card, you may add one
   short sentence telling the user which param to fill next (the card's
   bottom line already hints at this — your line is optional shorthand).
5. **Confirm.** When the preview card appears, wait for explicit approval
   (e.g. "확정", "yes", "응"). Then re-call with `confirm: true`.

## Mode 3 (AI generation)

If the user picks `appearance_mode: "3"` with an `ai_prompt`, the tool
returns instructions for *you* (the host LLM) to draw 3 ASCII frames of
the described character within strict size limits (max 6 rows × 14 cols).
Draw them, then re-call `bbuddy_create` with `appearance_mode: "4"` and
`manual_frame1/2/3` set to your ASCII.

## Parameter reference

```js
bbuddy_create({
  name: "Mochi",              // step 1
  appearance_mode: "1",       // step 2: "1" species | "2" parts | "3" AI | "4" manual
  species: "Void Cat",        // mode 1
  parts: { face, eye, accessory, body }, // mode 2
  ai_prompt: "hacker cat",    // mode 3
  manual_frame1: "...",       // mode 4 (and mode 3 follow-up)
  manual_frame2: "...",       // optional
  manual_frame3: "...",       // optional
  personality_preset: "sage", // step 3: tsundere|passionate|cold|prankster|sage|custom
  custom_prompt: "...",       // required when preset === "custom"
  stats: { DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK }, // step 4: sum = 100
  confirm: true,              // finalize after user approves preview
})
```
