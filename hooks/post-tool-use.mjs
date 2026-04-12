#!/usr/bin/env node
/**
 * bbuddy PostToolUse hook
 * Reacts to Bash tool results:
 *   - Success → excited reaction (★ eye, positive text)
 *   - Failure → concerned reaction (>.<  eye, supportive text)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');
const REACTION_TTL_MS = 20_000;

function getLang() {
  try {
    const _require = createRequire(import.meta.url);
    const Database = _require(join(homedir(), '.bbuddy', 'server', 'node_modules', 'better-sqlite3'));
    const db = new Database(join(homedir(), '.bbuddy', 'bbuddy.db'), { readonly: true });
    const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get();
    db.close();
    if (row?.value === 'ko' || row?.value === 'en') return row.value;
  } catch { /* non-fatal */ }
  return 'en';
}

const REACTION_POOLS = {
  en: {
    success: ['nice!', 'good!', 'done!', 'sweet~', 'works!', 'yes!', 'perfect'],
    fail:    ['no worries', 'try again', 'hmm...', 'error time', 'lets squash it', 'got it together'],
  },
  ko: {
    success: ['잘됐다!', '굿!', '완료!', '좋아~', '성공!', '오예!', '완벽해'],
    fail:    ['괜찮아...', '다시 해봐', '흠...', '에러다', '버그 잡자!', '같이 보자'],
  },
};

const POOLS = REACTION_POOLS[getLang()];
const SUCCESS_TEXTS = POOLS.success;
const FAIL_TEXTS = POOLS.fail;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Read hook input
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* non-fatal */ }

// Only react to Bash tool
if (input.tool_name !== 'Bash') process.exit(0);
if (!existsSync(STATUS_PATH)) process.exit(0);

try {
  // Detect failure from tool response
  const response = input.tool_response ?? input.tool_result ?? {};
  const outputText = typeof response.output === 'string'
    ? response.output
    : (Array.isArray(response) ? response.map(b => b?.text ?? '').join('') : '');

  const isError =
    response.is_error === true ||
    /exit code [1-9]\d*/i.test(outputText) ||
    /error:/i.test(outputText.slice(0, 200));

  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));

  if (isError) {
    buddy.reaction = 'concerned';
    buddy.reaction_eye = '>.<';
    buddy.reaction_indicator = '...';
    buddy.reaction_text = pick(FAIL_TEXTS);
  } else {
    buddy.reaction = 'excited';
    buddy.reaction_eye = '★';
    buddy.reaction_indicator = '!';
    buddy.reaction_text = pick(SUCCESS_TEXTS);
  }
  buddy.reaction_expires = Date.now() + REACTION_TTL_MS;

  writeFileSync(STATUS_PATH, JSON.stringify(buddy, null, 2));
} catch { /* non-fatal */ }

process.exit(0);
