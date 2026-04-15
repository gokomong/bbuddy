// src/__tests__/creator.test.ts
import { describe, it, expect } from 'vitest';
import { validateStatDistribution, normaliseStats, STAT_POOL } from '../creator/stats.js';
import { generatePresetBio, PRESETS } from '../creator/presets.js';
import { evaluateWizardState, renderWizardPrompt, renderPreviewText } from '../creator/wizard.js';
import { getSpeciesPreviewFrame } from '../lib/species.js';
import { STAT_NAMES } from '../lib/types.js';

// --- validateStatDistribution ---

describe('validateStatDistribution', () => {
  const validStats = { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 };

  it('accepts a valid distribution summing to 100', () => {
    expect(validateStatDistribution(validStats)).toEqual({ valid: true });
  });

  it('rejects a distribution not summing to 100', () => {
    const bad = { ...validStats, SNARK: 5 };
    const result = validateStatDistribution(bad);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/sum/i);
  });

  it('rejects a stat below minimum (1)', () => {
    const bad = { ...validStats, SNARK: 0, PATIENCE: 25 };
    const result = validateStatDistribution(bad);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/SNARK/);
  });

  it('rejects a stat above maximum (80)', () => {
    const bad = { DEBUGGING: 81, PATIENCE: 4, CHAOS: 5, WISDOM: 5, SNARK: 5 };
    const result = validateStatDistribution(bad);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/DEBUGGING/);
  });

  it('rejects non-integer values', () => {
    const bad = { ...validStats, SNARK: 10.5, PATIENCE: 24.5 };
    const result = validateStatDistribution(bad);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/whole number/i);
  });

  it('rejects missing stats', () => {
    const bad = { DEBUGGING: 100 } as any;
    const result = validateStatDistribution(bad);
    expect(result.valid).toBe(false);
  });
});

// --- normaliseStats ---

describe('normaliseStats', () => {
  it('rounds and returns all 5 stat names', () => {
    const raw = { DEBUGGING: 40.4, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 };
    const result = normaliseStats(raw);
    expect(result.DEBUGGING).toBe(40);
    expect(Object.keys(result)).toHaveLength(5);
    for (const n of STAT_NAMES) expect(typeof result[n]).toBe('number');
  });
});

// --- generatePresetBio ---

describe('generatePresetBio', () => {
  const stats = { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 };

  for (const preset of ['tsundere', 'passionate', 'cold', 'prankster', 'sage'] as const) {
    it(`generates non-empty bio for preset: ${preset}`, () => {
      const bio = generatePresetBio(preset, 'Mochi', 'Void Cat', stats);
      expect(bio.length).toBeGreaterThan(10);
      expect(bio).not.toContain('{name}');
      expect(bio).not.toContain('{species}');
      expect(bio).not.toContain('{peak}');
      expect(bio).not.toContain('{dump}');
    });
  }

  it('uses custom_prompt for custom preset', () => {
    const bio = generatePresetBio('custom', 'Mochi', 'Void Cat', stats, 'Very grumpy but helpful.');
    expect(bio).toBe('Very grumpy but helpful.');
  });

  it('falls back gracefully when custom has no prompt', () => {
    const bio = generatePresetBio('custom', 'Mochi', 'Void Cat', stats);
    expect(bio.length).toBeGreaterThan(0);
  });
});

// --- evaluateWizardState ---

describe('evaluateWizardState', () => {
  it('returns step=name when name is missing', () => {
    const state = evaluateWizardState({});
    expect(state.step).toBe('name');
    expect(state.missing).toContain('name');
  });

  it('returns step=species when name is set but species missing', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1' });
    expect(state.step).toBe('species');
    expect(state.completed).toContain('name');
  });

  it('returns step=personality when name+species set', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1', species: 'Void Cat' });
    expect(state.step).toBe('personality');
  });

  it('returns step=stats when name+species+personality set', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '1',
      species: 'Void Cat',
      personality_preset: 'tsundere',
    });
    expect(state.step).toBe('stats');
  });

  it('returns step=ready when all fields are valid', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '1',
      species: 'Void Cat',
      personality_preset: 'tsundere',
      stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
    });
    expect(state.step).toBe('ready');
    expect(state.missing).toHaveLength(0);
  });

  it('returns step=personality when custom preset has no custom_prompt', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '1',
      species: 'Void Cat',
      personality_preset: 'custom',
      // custom_prompt missing
    });
    expect(state.step).toBe('personality');
  });

  it('returns step=ready when custom preset has custom_prompt', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '1',
      species: 'Void Cat',
      personality_preset: 'custom',
      custom_prompt: 'Very grumpy.',
      stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
    });
    expect(state.step).toBe('ready');
  });

  it('returns step=stats when stats do not sum to 100', () => {
    const state = evaluateWizardState({
      name: 'Mochi',
      appearance_mode: '1',
      species: 'Void Cat',
      personality_preset: 'tsundere',
      stats: { DEBUGGING: 10, PATIENCE: 10, CHAOS: 10, WISDOM: 10, SNARK: 10 },
    });
    expect(state.step).toBe('stats');
  });

  it('rejects invalid species', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1', species: 'FakeSpecies' });
    expect(state.step).toBe('species');
  });
});

// --- renderWizardPrompt (framed card shell) ---

describe('renderWizardPrompt', () => {
  it('wraps output in a `.______.` top and `\'______\'` bottom frame', () => {
    const state = evaluateWizardState({});
    const card = renderWizardPrompt(state, {});
    const lines = card.split('\n');
    expect(lines[0]).toMatch(/^\._+\.$/);
    expect(lines[lines.length - 1]).toMatch(/^'_+'$/);
  });

  it('every body line is framed with `|` borders of equal width', () => {
    const state = evaluateWizardState({ name: 'Mochi' });
    const card = renderWizardPrompt(state, { name: 'Mochi' });
    const lines = card.split('\n');
    const width = lines[0].length;
    for (const line of lines) {
      expect(line.length).toBe(width);
    }
    for (const line of lines.slice(1, -1)) {
      expect(line.startsWith('| ')).toBe(true);
      expect(line.endsWith(' |')).toBe(true);
    }
  });

  it('shows the species grid when on the species step', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1' });
    const card = renderWizardPrompt(state, { name: 'Mochi', appearance_mode: '1' });
    expect(card).toContain('Void Cat');
    expect(card).toContain('Owl');
    expect(card).toContain('Chonk');
  });

  it('shows the name once accumulated', () => {
    const state = evaluateWizardState({ name: 'Mochi', appearance_mode: '1' });
    const card = renderWizardPrompt(state, { name: 'Mochi', appearance_mode: '1' });
    expect(card).toContain('Mochi');
  });

  it('includes progress indicator dots', () => {
    const state = evaluateWizardState({ name: 'Mochi' });
    const card = renderWizardPrompt(state, { name: 'Mochi' });
    expect(card).toMatch(/[●◉○]/);
  });
});

// --- renderPreviewText (preview card with sprite) ---

describe('renderPreviewText', () => {
  const stats = { DEBUGGING: 22, PATIENCE: 24, CHAOS: 14, WISDOM: 28, SNARK: 12 };

  it('renders a framed preview card', () => {
    const card = renderPreviewText('Mochi', 'Owl', 'Sage', 'Wise owl.', stats);
    const lines = card.split('\n');
    expect(lines[0]).toMatch(/^\._+\.$/);
    expect(lines[lines.length - 1]).toMatch(/^'_+'$/);
  });

  it('includes stat bars for every stat', () => {
    const card = renderPreviewText('Mochi', 'Owl', 'Sage', 'Wise owl.', stats);
    for (const name of STAT_NAMES) {
      expect(card).toContain(name);
    }
  });

  it('embeds sprite lines when a species frame is passed', () => {
    const frame = getSpeciesPreviewFrame('Owl');
    expect(frame).toBeDefined();
    const card = renderPreviewText('Mochi', 'Owl', 'Sage', 'Wise owl.', stats, frame);
    for (const line of frame!) {
      const trimmed = line.trim();
      if (trimmed) expect(card).toContain(trimmed);
    }
  });

  it('omits sprite section when no frame is provided', () => {
    const frame = getSpeciesPreviewFrame('Owl')!;
    const withFrame = renderPreviewText('Mochi', 'Owl', 'Sage', 'Wise.', stats, frame);
    const withoutFrame = renderPreviewText('Mochi', 'Owl', 'Sage', 'Wise.', stats);
    // The with-frame card has more lines (sprite + separator)
    expect(withFrame.split('\n').length).toBeGreaterThan(withoutFrame.split('\n').length);
  });
});
