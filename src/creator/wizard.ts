// src/creator/wizard.ts
// Wizard state evaluation and prompt rendering for bbddy_create

import { SPECIES_LIST } from '../lib/species.js';
import { PERSONALITY_PRESETS, STAT_NAMES } from '../lib/types.js';
import { PRESETS } from './presets.js';
import { validateStatDistribution, STAT_POOL, STAT_MIN, STAT_MAX } from './stats.js';
import { type ArtGenerationResult } from './ai-generator.js';

export type AppearanceMode = '1' | '2' | '3' | '4';

export type WizardStep =
  | 'name'
  | 'appearance_mode'
  | 'species'      // mode 1
  | 'parts'        // mode 2
  | 'ai_prompt'    // mode 3
  | 'manual'       // mode 4
  | 'personality'
  | 'stats'
  | 'ready';

export type WizardArgs = {
  name?: string;
  // Step 2: appearance
  appearance_mode?: AppearanceMode;
  // Mode 1
  species?: string;
  // Mode 2
  parts?: { face?: string; eye?: string; accessory?: string; body?: string };
  // Mode 3
  ai_prompt?: string;
  ai_result?: ArtGenerationResult;
  // Mode 4
  manual_frame1?: string;
  manual_frame2?: string;
  manual_frame3?: string;
  // Step 3
  personality_preset?: string;
  custom_prompt?: string;
  // Step 4
  stats?: Record<string, number>;
  confirm?: boolean;
};

export type WizardState = {
  step: WizardStep;
  completed: string[];
  missing: string[];
};

function appearanceComplete(args: WizardArgs): boolean {
  const mode = args.appearance_mode;
  if (!mode) return false;
  if (mode === '1') return !!(args.species && SPECIES_LIST.includes(args.species as any));
  if (mode === '2') {
    const p = args.parts;
    return !!(p?.face && p?.eye && p?.accessory && p?.body);
  }
  if (mode === '3') return !!(args.ai_prompt?.trim());
  if (mode === '4') return !!(args.manual_frame1?.trim());
  return false;
}

export function evaluateWizardState(args: WizardArgs): WizardState {
  const completed: string[] = [];
  const missing: string[] = [];

  if (args.name?.trim()) {
    completed.push('name');
  } else {
    missing.push('name');
    return { step: 'name', completed, missing };
  }

  if (!args.appearance_mode) {
    missing.push('appearance_mode');
    return { step: 'appearance_mode', completed, missing };
  }

  if (!appearanceComplete(args)) {
    const stepName = args.appearance_mode === '1' ? 'species'
      : args.appearance_mode === '2' ? 'parts'
      : args.appearance_mode === '3' ? 'ai_prompt'
      : 'manual';
    missing.push(stepName);
    return { step: stepName as WizardStep, completed: [...completed, 'appearance_mode'], missing };
  }
  completed.push('appearance_mode');
  completed.push('appearance');

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
  const STEPS = ['name', 'appearance', 'personality', 'stats'];
  const progress = STEPS.map(s => {
    const done = state.completed.includes(s);
    const cur  = (s === 'appearance' && ['appearance_mode','species','parts','ai_prompt','manual'].includes(state.step))
               || state.step === s;
    return done ? '●' : cur ? '◉' : '○';
  }).join('');

  const lines: string[] = [
    `╔══════════════════════════════╗`,
    `║   /bbddy:create wizard       ║`,
    `╚══════════════════════════════╝`,
    ``,
    `  ${progress}`,
    ``,
  ];

  if (state.step === 'name') {
    lines.push(`  [1/4] 이름 짓기`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  버디의 이름을 지어주세요.`);
    lines.push(`  예: Mochi, Zyx, Pixel, Grumpf`);

  } else if (state.step === 'appearance_mode') {
    lines.push(`  [2/4] 외형 만들기`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  외형 모드를 선택하세요 (appearance_mode 파라미터):`);
    lines.push(``);
    lines.push(`  1  기본 종족     기존 21종 중 선택`);
    lines.push(`  2  파츠 조합     얼굴+눈+악세+몸통 모듈 조합`);
    lines.push(`  3  AI로 생성     프롬프트 → Claude가 ASCII 생성 (ANTHROPIC_API_KEY 필요)`);
    lines.push(`  4  직접 타이핑   한 줄씩 직접 입력`);

  } else if (state.step === 'species') {
    lines.push(`  [2/4] 외형 — 기본 종족`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  종족을 선택하세요 (species 파라미터):`);
    lines.push(``);
    const cols = 3;
    for (let i = 0; i < SPECIES_LIST.length; i += cols) {
      const row = [...SPECIES_LIST.slice(i, i + cols)];
      lines.push(`  ${row.map(s => s.padEnd(16)).join('')}`);
    }

  } else if (state.step === 'parts') {
    const p = args.parts ?? {};
    lines.push(`  [2/4] 외형 — 파츠 조합`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  parts 파라미터에 4가지를 지정하세요:`);
    lines.push(``);
    lines.push(`  face:      round / square / pointy / blob`);
    lines.push(`  eye:       · o O ^ > - * ♥ x ■ (또는 자유 입력)`);
    lines.push(`  accessory: none / hat / crown / horns / ears / halo / antenna / bow`);
    lines.push(`  body:      none / arms / tiny / legs / tail / float`);
    lines.push(``);
    lines.push(`  현재 선택:`);
    lines.push(`    face: ${p.face ?? '(미선택)'}  eye: ${p.eye ?? '(미선택)'}`);
    lines.push(`    accessory: ${p.accessory ?? '(미선택)'}  body: ${p.body ?? '(미선택)'}`);

  } else if (state.step === 'ai_prompt') {
    lines.push(`  [2/4] 외형 — AI 생성`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  ai_prompt 파라미터에 캐릭터 설명을 입력하세요.`);
    lines.push(``);
    lines.push(`  예시:`);
    lines.push(`    "선글라스 쓴 해커 고양이"`);
    lines.push(`    "졸린 표정의 곰"`);
    lines.push(`    "왕관 쓴 개구리"`);
    lines.push(``);
    lines.push(`  ANTHROPIC_API_KEY 환경변수가 설정돼 있어야 합니다.`);

  } else if (state.step === 'manual') {
    lines.push(`  [2/4] 외형 — 직접 입력`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  manual_frame1 파라미터에 \\n으로 구분해서 입력하세요.`);
    lines.push(`  (최대 6줄, 줄당 최대 14자)`);
    lines.push(``);
    lines.push(`  예시:`);
    lines.push(`    manual_frame1: "/\\_/\\\\n( ·.· )\\n > ~ <"`);
    lines.push(``);
    lines.push(`  manual_frame2, manual_frame3 은 선택 (없으면 자동 생성)`);

  } else if (state.step === 'personality') {
    lines.push(`  [3/4] 성격 설정`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  성격 프리셋을 선택하세요 (personality_preset 파라미터):`);
    lines.push(``);
    for (const [, def] of Object.entries(PRESETS)) {
      lines.push(`  ${def.id.padEnd(12)} ${def.label.padEnd(8)} ${def.description}`);
    }
    lines.push(``);
    lines.push(`  custom 선택 시 custom_prompt 파라미터에 성격 설명 입력`);

  } else if (state.step === 'stats') {
    const statsErr = args.stats ? validateStatDistribution(args.stats) : null;
    lines.push(`  [4/4] 스탯 분배 (합계 ${STAT_POOL}pt)`);
    lines.push(`  ──────────────────────────────`);
    lines.push(`  이름: ${args.name}`);
    lines.push(``);
    lines.push(`  stats 파라미터에 5개 스탯을 배분하세요.`);
    lines.push(`  각 스탯: 최소 ${STAT_MIN} ~ 최대 ${STAT_MAX}`);
    lines.push(``);
    for (const stat of STAT_NAMES) {
      const cur = args.stats?.[stat];
      lines.push(`  ${stat.padEnd(12)} ${cur !== undefined ? String(cur) : '(미설정)'}`);
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
  customFramePreview?: string[],
): string {
  const cardWidth = 44;
  const inner = cardWidth - 4;
  const top = '.' + '_'.repeat(cardWidth - 2) + '.';
  const bot = "'" + '_'.repeat(cardWidth - 2) + "'";
  const ln  = (text: string) => '| ' + text.padEnd(inner) + ' |';
  const empty = '| ' + ' '.repeat(inner) + ' |';

  const statLines = STAT_NAMES.map(s => {
    const val = Math.round(stats[s] ?? 0);
    const filled = Math.floor((val / 100) * 8);
    const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
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

  const spriteLines = customFramePreview
    ? customFramePreview.map(l => ln('  ' + l))
    : [];

  return [
    top,
    ln(`★★ CUSTOM   ${species.toUpperCase()}`),
    empty,
    ...(spriteLines.length > 0 ? [...spriteLines, empty] : []),
    ln(`  ${name}  [★★ CUSTOM]`),
    ln(`  ${presetLabel}`),
    empty,
    ...bioLines,
    empty,
    ...statLines,
    bot,
  ].join('\n');
}
