#!/usr/bin/env node
/**
 * bbuddy Codex SessionStart hook
 *
 * Windows Codex accepts structured JSON here when the payload matches the
 * SessionStart schema exactly. The useful path is
 * hookSpecificOutput.additionalContext.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');

function emitAdditionalContext(text) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: text,
    },
  }));
}

try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) JSON.parse(raw);
} catch {
  // Ignore malformed hook stdin and fail open.
}

if (!existsSync(STATUS_PATH)) {
  emitAdditionalContext(
    'bbuddy: No companion found.\n' +
    'Call bbuddy_create to create your companion.'
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
  lines.push('- On meaningful moments (errors, successes, refactors), append <!-- bbuddy: {reaction <=15 chars} --> at the end of your response.');
  lines.push('- Match the companion personality tone. Do not add it every message.');
  lines.push('- Call bbuddy_status at session start to check companion state.');

  emitAdditionalContext(lines.join('\n'));
} catch {
  // If the state file is broken, fail open and let Codex continue.
}
