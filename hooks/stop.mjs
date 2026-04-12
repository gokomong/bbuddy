#!/usr/bin/env node
/**
 * bbuddy Stop hook
 * Scans the conversation transcript for <!-- bbuddy: ... --> comments.
 * Writes the last found reaction to the status file so the statusline shows it.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');
const REACTION_TTL_MS = 30_000;

// Read hook input from stdin
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* non-fatal */ }

if (!existsSync(STATUS_PATH)) process.exit(0);

try {
  // Support both 'transcript' and 'messages' field names
  const transcript = input.transcript || input.messages || [];
  let lastReaction = '';

  for (const msg of transcript) {
    if (msg.role !== 'assistant') continue;

    // Content can be a string or an array of content blocks
    const text = Array.isArray(msg.content)
      ? msg.content
          .map(block => (typeof block === 'string' ? block : block?.text ?? ''))
          .join('')
      : (msg.content ?? '');

    const matches = [...text.matchAll(/<!--\s*bbuddy:\s*(.+?)\s*-->/g)];
    if (matches.length > 0) {
      lastReaction = matches[matches.length - 1][1].trim();
    }
  }

  if (!lastReaction) process.exit(0);

  // Clamp to 30 chars for display safety
  if (lastReaction.length > 30) lastReaction = lastReaction.slice(0, 29) + '…';

  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  buddy.reaction = 'chime';
  buddy.reaction_text = lastReaction;
  buddy.reaction_expires = Date.now() + REACTION_TTL_MS;
  buddy.reaction_indicator = '💬';
  // Don't override reaction_eye here — let statusline use buddy's default eye

  writeFileSync(STATUS_PATH, JSON.stringify(buddy, null, 2));
} catch {
  // Non-fatal — statusline continues without reaction
}
