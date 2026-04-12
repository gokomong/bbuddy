#!/usr/bin/env node
/**
 * bbuddy PreToolUse hook
 * Sets a brief "working" state when a Bash command is about to run.
 * This makes the companion look busy in the statusline during execution.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');
const WORKING_TTL_MS = 15_000; // clears if post-tool-use doesn't fire

// Read hook input
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* non-fatal */ }

// Only react to Bash tool executions
if (input.tool_name !== 'Bash') process.exit(0);
if (!existsSync(STATUS_PATH)) process.exit(0);

try {
  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  buddy.reaction = 'working';
  buddy.reaction_expires = Date.now() + WORKING_TTL_MS;
  buddy.reaction_indicator = '⚙';
  buddy.reaction_text = '';
  // Keep the buddy's normal eye during working state
  buddy.reaction_eye = '';
  writeFileSync(STATUS_PATH, JSON.stringify(buddy, null, 2));
} catch { /* non-fatal */ }

// Always exit 0 — never block tool execution
process.exit(0);
