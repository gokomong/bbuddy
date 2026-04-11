// src/creator/parts-combiner.ts
// Modular ASCII sprite assembly from face + eye + accessory + body parts

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const PARTS = require('./sprites/parts.json') as PartsData;

type PartsData = {
  face: Record<string, string[]>;
  accessory: Record<string, string | null>;
  body: Record<string, string[]>;
  eyes: Record<string, string>;
};

export type PartsSelection = {
  face: string;       // round | square | pointy | blob
  eye: string;        // any string (free input or from eyes map)
  accessory: string;  // none | hat | crown | horns | ears | halo | antenna | bow
  body: string;       // none | arms | tiny | legs | tail | float
};

export type CustomSprite = {
  idleFrames: string[][];
  happyFrame: string[];
  sadFrame: string[];
  workingFrame: string[];
};

function substituteEye(lines: string[], eye: string): string[] {
  return lines.map(l => l.replaceAll('{E}', eye));
}

function padCenter(lines: string[], width: number): string[] {
  return lines.map(l => {
    const pad = Math.max(0, Math.floor((width - l.length) / 2));
    return ' '.repeat(pad) + l;
  });
}

function buildFrame(parts: PartsSelection, eyeOverride?: string): string[] {
  const eye = eyeOverride ?? parts.eye;
  const faceTemplate = PARTS.face[parts.face] ?? PARTS.face['round']!;
  const faceLines = substituteEye([...faceTemplate], eye);

  const width = Math.max(...faceLines.map(l => l.length));

  const result: string[] = [];

  // Accessory on top
  const acc = PARTS.accessory[parts.accessory];
  if (acc) result.push(...padCenter([acc], width));

  // Face
  result.push(...faceLines);

  // Body below
  const bodyLines = PARTS.body[parts.body] ?? [];
  if (bodyLines.length > 0) result.push(...padCenter(bodyLines, width));

  return result;
}

export function combineParts(parts: PartsSelection): CustomSprite {
  // idle frame 1: normal
  const idle1 = buildFrame(parts);
  // idle frame 2: blink (eye → -)
  const idle2 = buildFrame(parts, '-');
  // idle frame 3: squint (eye → ^)
  const idle3 = buildFrame(parts, parts.eye === '^' ? '·' : '^');

  const happyFrame = buildFrame(parts, '^');
  const sadFrame   = buildFrame(parts, 'T');
  const workingFrame = buildFrame(parts, '@');

  return {
    idleFrames: [idle1, idle2, idle3],
    happyFrame,
    sadFrame,
    workingFrame,
  };
}

export function listPartsOptions(): { faces: string[]; accessories: string[]; bodies: string[]; eyes: string[] } {
  return {
    faces:       Object.keys(PARTS.face),
    accessories: Object.keys(PARTS.accessory),
    bodies:      Object.keys(PARTS.body),
    eyes:        Object.keys(PARTS.eyes),
  };
}

export function eyeCharFor(name: string): string {
  return (PARTS.eyes as Record<string, string>)[name] ?? name;
}
