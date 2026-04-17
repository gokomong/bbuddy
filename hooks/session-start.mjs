#!/usr/bin/env node
/**
 * bbuddy SessionStart hook
 * Reads companion status and injects companion context into Claude's system prompt.
 * If no companion exists, prompts the user to create one.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createRequire } from 'module';

const STATUS_PATH = join(homedir(), '.claude', 'bbuddy-status.json');
const DB_PATH = join(homedir(), '.bbuddy', 'bbuddy.db');

// Best-effort migration from pre-rename paths. Mirrors migrateLegacyPaths()
// in src/db/schema.ts so the hook works even when the server hasn't been
// invoked yet in this session. Silent on failure.
(function migrate() {
  try {
    const bbuddyDir = join(homedir(), '.bbuddy');
    if (!existsSync(DB_PATH)) {
      mkdirSync(bbuddyDir, { recursive: true });
      for (const legacy of [
        join(homedir(), '.bbddy', 'bbddy.db'),
        join(homedir(), '.buddy', 'buddy.db'),
      ]) {
        if (existsSync(legacy)) { copyFileSync(legacy, DB_PATH); break; }
      }
    }
    const legacyStatus = join(homedir(), '.claude', 'bbddy-status.json');
    if (!existsSync(STATUS_PATH) && existsSync(legacyStatus)) {
      copyFileSync(legacyStatus, STATUS_PATH);
    }
  } catch { /* non-fatal */ }
})();

// Read hook input from stdin
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* no stdin or parse error — non-fatal */ }

// Read the user's preferred language from the settings table. Fall back to
// English if the DB or table is missing. Hooks run as standalone scripts so
// we can't import the TS i18n module directly.
function getLang() {
  try {
    const _require = createRequire(import.meta.url);
    const Database = _require(join(homedir(), '.bbuddy', 'server', 'node_modules', 'better-sqlite3'));
    const db = new Database(DB_PATH, { readonly: true });
    const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get();
    db.close();
    if (row?.value === 'ko' || row?.value === 'en') return row.value;
  } catch { /* table missing or better-sqlite3 not available */ }
  return 'en';
}

const STRINGS = {
  en: {
    noCompanion:
      'bbuddy: No companion found.\n' +
      'Use the bbuddy_create MCP tool to create your companion, or type /bbuddy:create for guided setup.',
    identity: (b) => `You have a coding buddy named "${b.name}" (${b.species}, Lv.${b.level || 1}) sitting next to you.`,
    mood: (m) => `Current mood: ${m}.`,
    personality: (bio) => `Personality: "${bio}"`,
    stats: (s) => `Stats — DEBUGGING:${s.DEBUGGING} PATIENCE:${s.PATIENCE} CHAOS:${s.CHAOS} WISDOM:${s.WISDOM} SNARK:${s.SNARK}`,
    rulesHeader: 'Rules:',
    rule1: '- Only at meaningful moments (writing code, hitting an error, succeeding, refactoring) append <!-- bbuddy: {reaction, max 15 chars} --> to the very end of your response.',
    rule2: "- Match the buddy's personality and tone. Don't attach a reaction every time.",
    rule3: '- Call bbuddy_status at session start to check the buddy.',
  },
  ko: {
    noCompanion:
      'bbuddy: 컴패니언이 없습니다.\n' +
      'bbuddy_create MCP 도구를 사용하거나 /bbuddy:create 를 입력해 가이드를 따라 만드세요.',
    identity: (b) => `너 옆에 "${b.name}"이라는 코딩 버디(${b.species}, Lv.${b.level || 1})가 앉아있다.`,
    mood: (m) => `현재 기분: ${m}.`,
    personality: (bio) => `성격: "${bio}"`,
    stats: (s) => `스탯 — DEBUGGING:${s.DEBUGGING} PATIENCE:${s.PATIENCE} CHAOS:${s.CHAOS} WISDOM:${s.WISDOM} SNARK:${s.SNARK}`,
    rulesHeader: '규칙:',
    rule1: '- 코드 작성, 에러 발생, 성공, 리팩토링 같은 의미 있는 순간에만 응답 맨 끝에 <!-- bbuddy: {15자 이내 반응} --> 을 붙여라',
    rule2: '- 버디의 성격과 톤에 맞게 작성하고, 매번 붙이지 말 것',
    rule3: '- 세션 시작 시 bbuddy_status 도구로 버디 상태를 확인하라',
  },
};

const M = STRINGS[getLang()];

if (!existsSync(STATUS_PATH)) {
  console.log(M.noCompanion);
  process.exit(0);
}

try {
  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  if (!buddy?.name) process.exit(0);

  const lines = [];
  lines.push(M.identity(buddy));
  if (buddy.mood) lines.push(M.mood(buddy.mood));
  if (buddy.personality_bio) lines.push(M.personality(buddy.personality_bio));
  if (buddy.stats) lines.push(M.stats(buddy.stats));

  lines.push('');
  lines.push(M.rulesHeader);
  lines.push(M.rule1);
  lines.push(M.rule2);
  lines.push(M.rule3);

  console.log(lines.join('\n'));
} catch {
  // status parse failed — silently skip to avoid breaking the session
}
