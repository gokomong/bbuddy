#!/usr/bin/env node
/**
 * bbddy Codex Stop hook
 * Two jobs:
 *   1. Extract <!-- bbddy: ... --> from transcript → write to status file (same as stop.mjs)
 *   2. Render companion sprite + reaction to stdout so Codex shows it to the user
 *      (Codex has no custom statusline widget, so we render here instead)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbddy-status.json');
const REACTION_TTL_MS = 30_000;

const RESET   = '\x1b[0m';
const DIM     = '\x1b[2m';
const CYAN    = '\x1b[36m';
const YELLOW  = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const GREEN   = '\x1b[32m';

// Read hook input
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* non-fatal */ }

if (!existsSync(STATUS_PATH)) process.exit(0);

// ── Step 1: extract reaction from transcript ──

let reaction = '';
try {
  const transcript = input.transcript || input.messages || [];
  for (const msg of transcript) {
    if (msg.role !== 'assistant') continue;
    const text = Array.isArray(msg.content)
      ? msg.content.map(b => (typeof b === 'string' ? b : b?.text ?? '')).join('')
      : (msg.content ?? '');
    const matches = [...text.matchAll(/<!--\s*bbddy:\s*(.+?)\s*-->/g)];
    if (matches.length > 0) reaction = matches[matches.length - 1][1].trim().slice(0, 30);
  }
} catch { /* non-fatal */ }

// ── Step 2: update status file ──

let buddy;
try {
  buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  if (!buddy?.name) process.exit(0);

  if (reaction) {
    buddy.reaction = 'chime';
    buddy.reaction_text = reaction;
    buddy.reaction_expires = Date.now() + REACTION_TTL_MS;
    buddy.reaction_indicator = '💬';
    writeFileSync(STATUS_PATH, JSON.stringify(buddy, null, 2));
  }
} catch { process.exit(0); }

// ── Step 3: render sprite to stdout ──
// Codex shows hook stdout to the user, so we render inline instead of statusline.

try {
  // Pick a sprite frame
  let artLines = [];

  if (Array.isArray(buddy.custom_idle_frames) && buddy.custom_idle_frames.length > 0) {
    const frames = buddy.custom_idle_frames;
    artLines = frames[Math.floor(Math.random() * frames.length)] ?? frames[0];
  } else if (buddy.ascii) {
    let ascii = buddy.ascii;
    if (buddy.eye) ascii = ascii.replaceAll('{E}', buddy.eye);
    artLines = ascii.split('\n');
  }

  if (artLines.length === 0) process.exit(0);

  // Apply reaction eye override if active
  const reactionActive = buddy.reaction_expires && Date.now() < buddy.reaction_expires;
  if (reactionActive && buddy.reaction_eye) {
    artLines = artLines.map(line =>
      buddy.eye && line.includes(buddy.eye)
        ? line.replaceAll(buddy.eye, buddy.reaction_eye)
        : line
    );
  }

  // Mood color for name line
  const moodColor = (mood) => {
    switch (mood) {
      case 'happy': case 'content': return GREEN;
      case 'curious': return CYAN;
      case 'grumpy': return YELLOW;
      default: return DIM;
    }
  };

  const speechLine = (reactionActive && buddy.reaction_text)
    ? `${DIM}"${buddy.reaction_text}"${RESET}`
    : '';

  const nameLine = `${CYAN}${buddy.name}${RESET} ${DIM}(${buddy.species})${RESET} ${YELLOW}Lv.${buddy.level}${RESET}`;
  const moodLine = `${moodColor(buddy.mood)}${buddy.mood || 'idle'}${RESET}  ${DIM}XP:${buddy.xp}${RESET}`;

  const artWidth = Math.max(...artLines.map(l => l.length));
  const out = [];
  out.push('');
  for (let i = 0; i < artLines.length; i++) {
    const art = `${MAGENTA}${(artLines[i] || '').padEnd(artWidth)}${RESET}`;
    if (i === 0) out.push(`  ${art}  ${nameLine}`);
    else if (i === 1) out.push(`  ${art}  ${moodLine}`);
    else if (i === 2 && speechLine) out.push(`  ${art}  ${speechLine}`);
    else out.push(`  ${art}`);
  }
  if (speechLine && artLines.length <= 2) out.push(`  ${' '.repeat(artWidth + 2)}${speechLine}`);
  out.push('');

  process.stdout.write(out.join('\n'));
} catch { /* non-fatal — skip render */ }
