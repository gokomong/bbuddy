#!/usr/bin/env node
/**
 * bbddy Codex SessionStart hook
 * Injects companion context into Codex session.
 * Same logic as session-start.mjs but tailored for Codex's instruction format.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbddy-status.json');

let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* non-fatal */ }

if (!existsSync(STATUS_PATH)) {
  console.log(
    'bbddy: No companion found.\n' +
    'Call bbddy_create to create your companion.'
  );
  process.exit(0);
}

try {
  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  if (!buddy?.name) process.exit(0);

  const lines = [];
  lines.push(`Your coding companion "${buddy.name}" (${buddy.species}, Lv.${buddy.level || 1}) is with you.`);

  if (buddy.mood) lines.push(`Current mood: ${buddy.mood}.`);
  if (buddy.personality_bio) lines.push(`Personality: "${buddy.personality_bio}"`);
  if (buddy.stats) {
    const s = buddy.stats;
    lines.push(
      `Stats — DEBUGGING:${s.DEBUGGING} PATIENCE:${s.PATIENCE} CHAOS:${s.CHAOS} WISDOM:${s.WISDOM} SNARK:${s.SNARK}`
    );
  }

  lines.push('');
  lines.push('Rules:');
  lines.push('- On meaningful moments (errors, successes, refactors), append <!-- bbddy: {reaction ≤15 chars} --> at the end of your response.');
  lines.push('- Match the companion personality tone. Do not add it every message.');
  lines.push('- Call bbddy_status at session start to check companion state.');

  console.log(lines.join('\n'));
} catch { /* non-fatal */ }
