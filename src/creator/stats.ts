// src/creator/stats.ts
// Manual stat distribution validator for bbuddy_create

import { type StatName, STAT_NAMES } from '../lib/types.js';

export const STAT_POOL = 100;
export const STAT_MIN = 1;
export const STAT_MAX = 80;

export function validateStatDistribution(
  stats: Record<string, number>,
): { valid: boolean; error?: string } {
  for (const name of STAT_NAMES) {
    const val = stats[name];
    if (val === undefined || val === null) {
      return { valid: false, error: `Missing stat: ${name}` };
    }
    if (!Number.isInteger(val)) {
      return { valid: false, error: `${name} must be a whole number` };
    }
    if (val < STAT_MIN) {
      return { valid: false, error: `${name} must be at least ${STAT_MIN}` };
    }
    if (val > STAT_MAX) {
      return { valid: false, error: `${name} cannot exceed ${STAT_MAX}` };
    }
  }

  const total = STAT_NAMES.reduce((sum, n) => sum + (stats[n] ?? 0), 0);
  if (total !== STAT_POOL) {
    return { valid: false, error: `Stats must sum to ${STAT_POOL}, got ${total}` };
  }

  return { valid: true };
}

export function normaliseStats(raw: Record<string, number>): Record<StatName, number> {
  const out = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    out[name] = Math.round(raw[name] ?? 0);
  }
  return out;
}
