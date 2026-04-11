// src/creator/manual-input.ts
// Line-by-line manual sprite input for bbddy_create mode 4

import { type CustomSprite } from './parts-combiner.js';

export type ManualSpriteInput = {
  frame1: string;   // newline-separated lines
  frame2?: string;
  frame3?: string;
};

const MAX_COLS = 14;
const MAX_ROWS = 6;

function parseFrame(text: string): string[] {
  return text
    .split('\n')
    .slice(0, MAX_ROWS)
    .map(l => l.slice(0, MAX_COLS));
}

// Auto-generate blink/squint variants by substituting common eye patterns
function autoVariant(lines: string[], fromEye: string, toEye: string): string[] {
  return lines.map(l => l.replaceAll(fromEye, toEye));
}

function deriveEmote(frame1: string[], eye: string, replacement: string): string[] {
  const result = autoVariant(frame1, eye, replacement);
  // If nothing changed, just return original (no known eye pattern)
  return result;
}

export function parseManualInput(input: ManualSpriteInput): CustomSprite {
  const idle1 = parseFrame(input.frame1);
  const idle2 = input.frame2 ? parseFrame(input.frame2) : autoVariant(idle1, '·', '-');
  const idle3 = input.frame3 ? parseFrame(input.frame3) : autoVariant(idle1, '·', '^');

  // Derive emotes — try common eye chars in order
  const eyeCandidates = ['·', 'o', 'O', '.', '0'];
  let happyFrame   = idle1;
  let sadFrame     = idle1;
  let workingFrame = idle1;

  for (const e of eyeCandidates) {
    const h = deriveEmote(idle1, e, '^');
    if (h !== idle1) { happyFrame = h; break; }
  }
  for (const e of eyeCandidates) {
    const s = deriveEmote(idle1, e, 'T');
    if (s !== idle1) { sadFrame = s; break; }
  }
  for (const e of eyeCandidates) {
    const w = deriveEmote(idle1, e, '@');
    if (w !== idle1) { workingFrame = w; break; }
  }

  return {
    idleFrames: [idle1, idle2, idle3],
    happyFrame,
    sadFrame,
    workingFrame,
  };
}

export function renderManualPreview(input: ManualSpriteInput): string {
  const sprite = parseManualInput(input);
  const lines = [
    'Frame 1 (idle):',
    ...sprite.idleFrames[0]!,
    '',
    'Frame 2 (blink):',
    ...sprite.idleFrames[1]!,
    '',
    'Frame 3 (squint):',
    ...sprite.idleFrames[2]!,
  ];
  return lines.join('\n');
}
