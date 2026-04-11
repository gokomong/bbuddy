// src/creator/wizard.ts
// Wizard state evaluation and prompt rendering for bbddy_create

import { SPECIES_LIST } from '../lib/species.js';
import { PERSONALITY_PRESETS, STAT_NAMES } from '../lib/types.js';
import { PRESETS } from './presets.js';
import { validateStatDistribution, STAT_POOL, STAT_MIN, STAT_MAX } from './stats.js';

export type WizardStep = 'name' | 'species' | 'personality' | 'stats' | 'ready';

export type WizardArgs = {
  name?: string;
  species?: string;
  personality_preset?: string;
  custom_prompt?: string;
  stats?: Record<string, number>;
  confirm?: boolean;
};

export type WizardState = {
  step: WizardStep;
  completed: string[];
  missing: string[];
};

export function evaluateWizardState(args: WizardArgs): WizardState {
  const completed: string[] = [];
  const missing: string[] = [];

  if (args.name?.trim()) {
    completed.push('name');
  } else {
    missing.push('name');
    return { step: 'name', completed, missing };
  }

  if (args.species && SPECIES_LIST.includes(args.species as any)) {
    completed.push('species');
  } else {
    missing.push('species');
    return { step: 'species', completed, missing };
  }

  const presetOk = args.personality_preset && PERSONALITY_PRESETS.includes(args.personality_preset as any);
  const customOk = args.personality_preset !== 'custom' || args.custom_prompt?.trim();
  if (presetOk && customOk) {
    completed.push('personality');
  } else {
    missing.push('personality');
    return { step: 'personality', completed, missing };
  }

  if (args.stats) {
    const result = validateStatDistribution(args.stats);
    if (result.valid) {
      completed.push('stats');
    } else {
      missing.push('stats');
      return { step: 'stats', completed, missing };
    }
  } else {
    missing.push('stats');
    return { step: 'stats', completed, missing };
  }

  return { step: 'ready', completed, missing: [] };
}

export function renderWizardPrompt(state: WizardState, args: WizardArgs): string {
  const steps = ['name', 'species', 'personality', 'stats'];
  const stepLabels: Record<string, string> = {
    name: '이름 짓기',
    species: '종족 선택',
    personality: '성격 설정',
    stats: '스탯 분배',
  };

  const progress = steps.map((s, i) => {
    const done = state.completed.includes(s);
    const current = state.step === s;
    return `${done ? '●' : current ? '◉' : '○'}`;
  }).join('');

  const stepNum = steps.indexOf(state.step) + 1;

  const lines: string[] = [
    `╔══════════════════════════════╗`,
    `║   /bbddy:create wizard       ║`,
    `╚══════════════════════════════╝`,
    ``,
    `  ${progress}  [${stepNum}/4]`,
    ``,
  ];

  if (state.step === 'name') {
    lines.push(`  [1/4] 이름 짓기`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  버디의 이름을 지어주세요.`);
    lines.push(`  예: Mochi, Zyx, Pixel, Grumpf`);
  } else if (state.step === 'species') {
    lines.push(`  [2/4] 종족 선택`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(`  `);
    lines.push(`  종족을 선택하세요:`);
    const cols = 3;
    const chunked: string[][] = [];
    for (let i = 0; i < SPECIES_LIST.length; i += cols) {
      chunked.push([...SPECIES_LIST.slice(i, i + cols)]);
    }
    for (const row of chunked) {
      lines.push(`  ${row.map(s => s.padEnd(16)).join('')}`);
    }
  } else if (state.step === 'personality') {
    lines.push(`  [3/4] 성격 설정`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}  종족: ${args.species}`);
    lines.push(``);
    lines.push(`  성격 프리셋을 선택하세요:`);
    lines.push(``);
    for (const [id, def] of Object.entries(PRESETS)) {
      lines.push(`  ${def.label.padEnd(10)} ${def.description}`);
    }
    lines.push(``);
    lines.push(`  (custom 선택 시 자유 텍스트로 성격 설명 입력 가능)`);
  } else if (state.step === 'stats') {
    const statsErr = args.stats ? validateStatDistribution(args.stats) : null;
    lines.push(`  [4/4] 스탯 분배 (합계 ${STAT_POOL}pt)`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}  종족: ${args.species}`);
    lines.push(``);
    lines.push(`  5개 스탯에 총 ${STAT_POOL}pt를 분배하세요.`);
    lines.push(`  각 스탯: 최소 ${STAT_MIN}, 최대 ${STAT_MAX}`);
    lines.push(``);
    lines.push(`  스탯 목록:`);
    for (const stat of STAT_NAMES) {
      const cur = args.stats?.[stat];
      lines.push(`  ${stat.padEnd(12)} ${cur !== undefined ? cur : '(미설정)'}`);
    }
    if (statsErr && !statsErr.valid) {
      lines.push(``);
      lines.push(`  ⚠ ${statsErr.error}`);
    }
    lines.push(``);
    lines.push(`  예시: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 }`);
  }

  return lines.join('\n');
}

export function renderPreviewText(
  name: string,
  species: string,
  presetLabel: string,
  bio: string,
  stats: Record<string, number>,
): string {
  const cardWidth = 44;
  const inner = cardWidth - 4;
  const top = '.' + '_'.repeat(cardWidth - 2) + '.';
  const bot = "'" + '_'.repeat(cardWidth - 2) + "'";
  const ln = (text: string) => '| ' + text.padEnd(inner) + ' |';
  const empty = '| ' + ' '.repeat(inner) + ' |';

  const statLines = STAT_NAMES.map(s => {
    const val = Math.round(stats[s] ?? 0);
    const totalBlocks = 8;
    const filled = Math.floor((val / 100) * totalBlocks);
    const bar = '█'.repeat(filled) + '░'.repeat(totalBlocks - filled);
    return ln(`${s.padEnd(10)} ${bar}   ${String(val).padStart(2)}`);
  });

  const bioWords = bio.split(' ');
  const bioLines: string[] = [];
  let cur = '';
  for (const w of bioWords) {
    if (cur.length + w.length + 1 > inner - 2 && cur) {
      bioLines.push(ln(' ' + cur));
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) bioLines.push(ln(' ' + cur));

  return [
    top,
    ln(`★★ UNCOMMON   ${species.toUpperCase()}`),
    empty,
    ln(`  ${name}  [★★ CUSTOM]`),
    ln(`  ${presetLabel}`),
    empty,
    ...bioLines,
    empty,
    ...statLines,
    bot,
  ].join('\n');
}
