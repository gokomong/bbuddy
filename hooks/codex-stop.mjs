#!/usr/bin/env node
/**
 * bbuddy Codex Stop hook
 *
 * Current Windows Codex accepts Stop hooks that stay silent or write to stderr,
 * but successful stderr output is not surfaced to the user. So the practical
 * behavior here is to update companion state only.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');
const REACTION_TTL_MS = 30_000;

let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch {
  process.exit(0);
}

if (!existsSync(STATUS_PATH)) process.exit(0);

let reaction = '';
try {
  const lastAssistantMessage = String(input.last_assistant_message || '');
  const matches = [...lastAssistantMessage.matchAll(/<!--\s*bbuddy:\s*(.+?)\s*-->/g)];
  if (matches.length > 0) {
    reaction = matches[matches.length - 1][1].trim().slice(0, 30);
  }
} catch {
  process.exit(0);
}

try {
  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  if (!buddy?.name) process.exit(0);

  if (reaction) {
    buddy.reaction = 'chime';
    buddy.reaction_text = reaction;
    buddy.reaction_expires = Date.now() + REACTION_TTL_MS;
    buddy.reaction_indicator = '💬';
    writeFileSync(STATUS_PATH, JSON.stringify(buddy, null, 2));
  }
} catch {
  process.exit(0);
}
