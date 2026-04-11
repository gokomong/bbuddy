// src/__tests__/creator-phase2.test.ts
import { describe, it, expect, vi } from 'vitest';
import { combineParts, type PartsSelection } from '../creator/parts-combiner.js';
import { parseManualInput, renderManualPreview } from '../creator/manual-input.js';
import { evaluateWizardState } from '../creator/wizard.js';

// --- combineParts ---

describe('combineParts', () => {
  const baseParts: PartsSelection = {
    face: 'round',
    eye: '·',
    accessory: 'none',
    body: 'none',
  };

  it('returns 3 idle frames', () => {
    const sprite = combineParts(baseParts);
    expect(sprite.idleFrames).toHaveLength(3);
  });

  it('idle frames are string arrays', () => {
    const sprite = combineParts(baseParts);
    for (const frame of sprite.idleFrames) {
      expect(Array.isArray(frame)).toBe(true);
      for (const line of frame) expect(typeof line).toBe('string');
    }
  });

  it('substitutes eye character — no {E} remains', () => {
    const sprite = combineParts({ ...baseParts, eye: 'O' });
    for (const frame of sprite.idleFrames) {
      for (const line of frame) expect(line).not.toContain('{E}');
    }
  });

  it('produces different idle frames (blink effect)', () => {
    const sprite = combineParts(baseParts);
    // frame 2 has blink eye '-', should differ from frame 1
    expect(sprite.idleFrames[0]).not.toEqual(sprite.idleFrames[1]);
  });

  it('has happyFrame, sadFrame, workingFrame', () => {
    const sprite = combineParts(baseParts);
    expect(Array.isArray(sprite.happyFrame)).toBe(true);
    expect(Array.isArray(sprite.sadFrame)).toBe(true);
    expect(Array.isArray(sprite.workingFrame)).toBe(true);
  });

  it('includes accessory line when accessory is not none', () => {
    const withCrown = combineParts({ ...baseParts, accessory: 'crown' });
    const withNone  = combineParts(baseParts);
    // Crown adds a line at the top, so frame should have more lines
    expect(withCrown.idleFrames[0]!.length).toBeGreaterThan(withNone.idleFrames[0]!.length);
  });

  it('includes body lines when body is not none', () => {
    const withArms = combineParts({ ...baseParts, body: 'arms' });
    const withNone = combineParts(baseParts);
    expect(withArms.idleFrames[0]!.length).toBeGreaterThan(withNone.idleFrames[0]!.length);
  });

  it('works with all face types', () => {
    for (const face of ['round', 'square', 'pointy', 'blob'] as const) {
      expect(() => combineParts({ ...baseParts, face })).not.toThrow();
    }
  });
});

// --- parseManualInput ---

describe('parseManualInput', () => {
  it('parses frame1 into string[]', () => {
    const sprite = parseManualInput({ frame1: '/\\_/\\\n( ·.· )\n > ~ <' });
    expect(sprite.idleFrames[0]).toHaveLength(3);
    expect(sprite.idleFrames[0]![0]).toBe('/\\_/\\');
  });

  it('returns 3 idle frames', () => {
    const sprite = parseManualInput({ frame1: '(·.·)' });
    expect(sprite.idleFrames).toHaveLength(3);
  });

  it('uses provided frame2 and frame3', () => {
    const sprite = parseManualInput({ frame1: '(·.·)', frame2: '(-.-)', frame3: '(^.^)' });
    expect(sprite.idleFrames[1]![0]).toBe('(-.-)')
    expect(sprite.idleFrames[2]![0]).toBe('(^.^)');
  });

  it('auto-generates frame2 when omitted', () => {
    const sprite = parseManualInput({ frame1: '/\\_/\\\n( ·.· )' });
    // frame2 is auto-generated, should not equal frame1
    expect(sprite.idleFrames[1]).toBeDefined();
  });

  it('trims to max 6 rows', () => {
    const frame1 = Array.from({ length: 10 }, (_, i) => `line${i}`).join('\n');
    const sprite = parseManualInput({ frame1 });
    expect(sprite.idleFrames[0]!.length).toBeLessThanOrEqual(6);
  });

  it('trims to max 14 chars per line', () => {
    const longLine = 'a'.repeat(20);
    const sprite = parseManualInput({ frame1: longLine });
    for (const line of sprite.idleFrames[0]!) {
      expect(line.length).toBeLessThanOrEqual(14);
    }
  });

  it('has happyFrame, sadFrame, workingFrame', () => {
    const sprite = parseManualInput({ frame1: '( ·.· )' });
    expect(Array.isArray(sprite.happyFrame)).toBe(true);
    expect(Array.isArray(sprite.sadFrame)).toBe(true);
    expect(Array.isArray(sprite.workingFrame)).toBe(true);
  });

  it('renderManualPreview returns non-empty string', () => {
    const preview = renderManualPreview({ frame1: '/\\_/\\\n( ·.· )' });
    expect(typeof preview).toBe('string');
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).toContain('Frame 1');
  });
});

// --- wizard Phase 2 steps ---

describe('evaluateWizardState Phase 2', () => {
  it('requires appearance_mode after name', () => {
    const state = evaluateWizardState({ name: 'Mochi' });
    expect(state.step).toBe('appearance_mode');
  });

  it('mode 1: requires species', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1' });
    expect(state.step).toBe('species');
  });

  it('mode 2: requires parts', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '2' });
    expect(state.step).toBe('parts');
  });

  it('mode 2: incomplete parts → still parts step', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '2', parts: { face: 'round' } });
    expect(state.step).toBe('parts');
  });

  it('mode 2: complete parts → personality step', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '2',
      parts: { face: 'round', eye: '·', accessory: 'none', body: 'none' },
    });
    expect(state.step).toBe('personality');
  });

  it('mode 3: requires ai_prompt', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '3' });
    expect(state.step).toBe('ai_prompt');
  });

  it('mode 3: ai_prompt set → personality step', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '3', ai_prompt: '선글라스 고양이' });
    expect(state.step).toBe('personality');
  });

  it('mode 4: requires manual_frame1', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '4' });
    expect(state.step).toBe('manual');
  });

  it('mode 4: manual_frame1 set → personality step', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '4', manual_frame1: '(·.·)' });
    expect(state.step).toBe('personality');
  });

  it('full mode 2 flow reaches ready', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '2',
      parts: { face: 'round', eye: '·', accessory: 'none', body: 'arms' },
      personality_preset: 'tsundere',
      stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
    });
    expect(state.step).toBe('ready');
  });

  it('full mode 3 flow reaches ready', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '3',
      ai_prompt: '고양이 해커',
      personality_preset: 'cold',
      stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
    });
    expect(state.step).toBe('ready');
  });

  it('full mode 4 flow reaches ready', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '4',
      manual_frame1: '(·.·)',
      personality_preset: 'sage',
      stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
    });
    expect(state.step).toBe('ready');
  });
});
