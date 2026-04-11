#!/usr/bin/env node
/**
 * bbddy SessionStart hook
 * Reads companion status and injects companion context into Claude's system prompt.
 * If no companion exists, prompts the user to create one.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const STATUS_PATH = join(homedir(), '.claude', 'bbddy-status.json');

// Read hook input from stdin
let input = {};
try {
  const raw = readFileSync(0, 'utf-8');
  if (raw.trim()) input = JSON.parse(raw);
} catch { /* no stdin or parse error — non-fatal */ }

if (!existsSync(STATUS_PATH)) {
  console.log(
    'bbddy: No companion found.\n' +
    'Use the bbddy_create MCP tool to create your companion, or type /bbddy:create for guided setup.'
  );
  process.exit(0);
}

try {
  const buddy = JSON.parse(readFileSync(STATUS_PATH, 'utf-8'));
  if (!buddy?.name) process.exit(0);

  const lines = [];

  // Core identity
  lines.push(`너 옆에 "${buddy.name}"이라는 코딩 버디(${buddy.species}, Lv.${buddy.level || 1})가 앉아있다.`);

  if (buddy.mood) lines.push(`현재 기분: ${buddy.mood}.`);

  if (buddy.personality_bio) lines.push(`성격: "${buddy.personality_bio}"`);

  if (buddy.stats) {
    const s = buddy.stats;
    lines.push(
      `스탯 — DEBUGGING:${s.DEBUGGING} PATIENCE:${s.PATIENCE} CHAOS:${s.CHAOS} WISDOM:${s.WISDOM} SNARK:${s.SNARK}`
    );
  }

  lines.push('');
  lines.push('규칙:');
  lines.push(
    '- 코드 작성, 에러 발생, 성공, 리팩토링 같은 의미 있는 순간에만 응답 맨 끝에 <!-- bbddy: {15자 이내 반응} --> 을 붙여라'
  );
  lines.push('- 버디의 성격과 톤에 맞게 작성하고, 매번 붙이지 말 것');
  lines.push('- 세션 시작 시 bbddy_status 도구로 버디 상태를 확인하라');

  console.log(lines.join('\n'));
} catch {
  // status parse failed — silently skip to avoid breaking the session
}
