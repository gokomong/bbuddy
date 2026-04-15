// src/creator/wizard.ts
// Wizard state evaluation and prompt rendering for bbuddy_create

import { SPECIES_LIST } from '../lib/species.js';
import { PERSONALITY_PRESETS, STAT_NAMES } from '../lib/types.js';
import { PRESETS } from './presets.js';
import { validateStatDistribution, STAT_POOL, STAT_MIN, STAT_MAX } from './stats.js';
import { getLang } from '../i18n/index.js';

// Wizard string catalog. English is the default; Korean is selected when
// the user runs `bbuddy_language ko`.
const WIZARD_STRINGS = {
  en: {
    title: '/bbuddy:create wizard',
    stepName: '[1/4] Choose a name',
    namePrompt: 'Give your buddy a name.',
    nameExample: 'e.g., Mochi, Zyx, Pixel, Grumpf',
    stepAppearance: '[2/4] Build appearance',
    name: 'Name',
    chooseAppearanceMode: 'Pick an appearance mode (appearance_mode parameter):',
    mode1Label: '1  Species      Pick from 21 built-in species',
    mode2Label: '2  Parts mix    Combine face + eye + accessory + body',
    mode3Label: '3  AI generate  Prompt → host LLM (Claude Code / Codex) draws ASCII',
    mode4Label: '4  Manual       Type the ASCII art yourself',
    mode1Title: '[2/4] Appearance — Species',
    mode1Prompt: 'Pick a species (species parameter):',
    mode2Title: '[2/4] Appearance — Parts mix',
    mode2Prompt: 'Set all four parts on the parts parameter:',
    mode2Face: 'face:      round / square / pointy / blob',
    mode2Eye: 'eye:       · o O ^ > - * ♥ x ■ (or any character)',
    mode2Accessory: 'accessory: none / hat / crown / horns / ears / halo / antenna / bow',
    mode2Body: 'body:      none / arms / tiny / legs / tail / float',
    mode2Current: 'Current:',
    unset: '(not set)',
    mode3Title: '[2/4] Appearance — AI generate',
    mode3Prompt: 'Set the ai_prompt parameter to a short character description.',
    mode3Examples: 'Examples:',
    mode3Ex1: '"hacker cat with sunglasses"',
    mode3Ex2: '"sleepy bear"',
    mode3Ex3: '"frog wearing a crown"',
    mode3Note: 'The host LLM (Claude Code / Codex) draws the art. No API key required.',
    mode4Title: '[2/4] Appearance — Manual',
    mode4Prompt: 'Set manual_frame1 to newline-separated lines.',
    mode4Limit: '(max 6 rows, max 14 chars per row)',
    mode4Ex1: 'manual_frame1: "/\\_/\\\\n( ·.· )\\n > ~ <"',
    mode4Note: 'manual_frame2 and manual_frame3 are optional (auto-generated if omitted).',
    personalityTitle: '[3/4] Personality',
    personalityPrompt: 'Pick a personality preset (personality_preset parameter):',
    personalityCustom: 'If you pick custom, also set custom_prompt with a free-form description.',
    statsTitle: (pool: number) => `[4/4] Distribute stats (total ${pool}pt)`,
    statsPrompt: 'Spread your points across the 5 stats on the stats parameter.',
    statsLimit: (min: number, max: number) => `Each stat: min ${min} ~ max ${max}`,
    statsExample: 'Example: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 }',
    previewConfirm: 'Happy with this buddy? Call the tool again with confirm: true to finalize. Change params and re-call to go back.',
  },
  ko: {
    title: '/bbuddy:create wizard',
    stepName: '[1/4] 이름 짓기',
    namePrompt: '버디의 이름을 지어주세요.',
    nameExample: '예: Mochi, Zyx, Pixel, Grumpf',
    stepAppearance: '[2/4] 외형 만들기',
    name: '이름',
    chooseAppearanceMode: '외형 모드를 선택하세요 (appearance_mode 파라미터):',
    mode1Label: '1  기본 종족     기존 21종 중 선택',
    mode2Label: '2  파츠 조합     얼굴+눈+악세+몸통 모듈 조합',
    mode3Label: '3  AI로 생성     프롬프트 → 호스트 LLM(Claude Code/Codex)이 ASCII 생성',
    mode4Label: '4  직접 타이핑   한 줄씩 직접 입력',
    mode1Title: '[2/4] 외형 — 기본 종족',
    mode1Prompt: '종족을 선택하세요 (species 파라미터):',
    mode2Title: '[2/4] 외형 — 파츠 조합',
    mode2Prompt: 'parts 파라미터에 4가지를 지정하세요:',
    mode2Face: 'face:      round / square / pointy / blob',
    mode2Eye: 'eye:       · o O ^ > - * ♥ x ■ (또는 자유 입력)',
    mode2Accessory: 'accessory: none / hat / crown / horns / ears / halo / antenna / bow',
    mode2Body: 'body:      none / arms / tiny / legs / tail / float',
    mode2Current: '현재 선택:',
    unset: '(미선택)',
    mode3Title: '[2/4] 외형 — AI 생성',
    mode3Prompt: 'ai_prompt 파라미터에 캐릭터 설명을 입력하세요.',
    mode3Examples: '예시:',
    mode3Ex1: '"선글라스 쓴 해커 고양이"',
    mode3Ex2: '"졸린 표정의 곰"',
    mode3Ex3: '"왕관 쓴 개구리"',
    mode3Note: '호스트 LLM(Claude Code / Codex)이 직접 그림을 만듭니다. 별도 API 키 불필요.',
    mode4Title: '[2/4] 외형 — 직접 입력',
    mode4Prompt: 'manual_frame1 파라미터에 \\n으로 구분해서 입력하세요.',
    mode4Limit: '(최대 6줄, 줄당 최대 14자)',
    mode4Ex1: 'manual_frame1: "/\\_/\\\\n( ·.· )\\n > ~ <"',
    mode4Note: 'manual_frame2, manual_frame3 은 선택 (없으면 자동 생성)',
    personalityTitle: '[3/4] 성격 설정',
    personalityPrompt: '성격 프리셋을 선택하세요 (personality_preset 파라미터):',
    personalityCustom: 'custom 선택 시 custom_prompt 파라미터에 성격 설명 입력',
    statsTitle: (pool: number) => `[4/4] 스탯 분배 (합계 ${pool}pt)`,
    statsPrompt: 'stats 파라미터에 5개 스탯을 배분하세요.',
    statsLimit: (min: number, max: number) => `각 스탯: 최소 ${min} ~ 최대 ${max}`,
    statsExample: '예시: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 }',
    previewConfirm: '캐릭터가 마음에 드시나요? confirm: true 로 호출하면 확정됩니다. 뒤로 가려면 파라미터를 수정해서 다시 호출하세요.',
  },
};

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

// Shared card frame. Used by every wizard step and the preview so the
// flow has one consistent visual shell.
const CARD_WIDTH = 48;
const CARD_INNER = CARD_WIDTH - 4;
const CARD_TOP = '.' + '_'.repeat(CARD_WIDTH - 2) + '.';
const CARD_BOT = "'" + '_'.repeat(CARD_WIDTH - 2) + "'";

function ln(text: string = ''): string {
  const clipped = text.length > CARD_INNER
    ? text.slice(0, CARD_INNER - 1) + '…'
    : text;
  return '| ' + clipped.padEnd(CARD_INNER) + ' |';
}

function drawCard(body: string[]): string {
  return [CARD_TOP, ...body.map(l => ln(l)), CARD_BOT].join('\n');
}

function progressDots(state: WizardState): string {
  const STEPS = ['name', 'appearance', 'personality', 'stats'];
  return STEPS.map(s => {
    const done = state.completed.includes(s);
    const cur  = (s === 'appearance' && ['appearance_mode','species','parts','ai_prompt','manual'].includes(state.step))
               || state.step === s;
    return done ? '●' : cur ? '◉' : '○';
  }).join(' ');
}

export function renderWizardPrompt(state: WizardState, args: WizardArgs): string {
  const M = WIZARD_STRINGS[getLang()];
  const body: string[] = [];
  const pushHeader = (title: string) => {
    body.push(title);
    body.push('');
    body.push(`  ${progressDots(state)}`);
    body.push('');
    if (args.name) {
      body.push(`  ${M.name}: ${args.name}`);
      body.push('');
    }
  };

  if (state.step === 'name') {
    pushHeader(M.stepName);
    body.push(`  ${M.namePrompt}`);
    body.push(`  ${M.nameExample}`);
    body.push('');
    body.push(`  → bbuddy_create({ name: "..." })`);

  } else if (state.step === 'appearance_mode') {
    pushHeader(M.stepAppearance);
    body.push(`  ${M.chooseAppearanceMode}`);
    body.push('');
    body.push(`  ${M.mode1Label}`);
    body.push(`  ${M.mode2Label}`);
    body.push(`  ${M.mode3Label}`);
    body.push(`  ${M.mode4Label}`);
    body.push('');
    body.push(`  → appearance_mode: "1" | "2" | "3" | "4"`);

  } else if (state.step === 'species') {
    pushHeader(M.mode1Title);
    body.push(`  ${M.mode1Prompt}`);
    body.push('');
    const colWidth = 22;
    for (let i = 0; i < SPECIES_LIST.length; i += 2) {
      const row = SPECIES_LIST.slice(i, i + 2).map(s => s.padEnd(colWidth)).join('');
      body.push(row);
    }
    body.push('');
    body.push(`  → species: "..."`);

  } else if (state.step === 'parts') {
    const p = args.parts ?? {};
    pushHeader(M.mode2Title);
    body.push(`  ${M.mode2Prompt}`);
    body.push('');
    body.push(`  ${M.mode2Face}`);
    body.push(`  ${M.mode2Eye}`);
    body.push(`  ${M.mode2Accessory}`);
    body.push(`  ${M.mode2Body}`);
    body.push('');
    body.push(`  ${M.mode2Current}`);
    body.push(`    face: ${p.face ?? M.unset}  eye: ${p.eye ?? M.unset}`);
    body.push(`    accessory: ${p.accessory ?? M.unset}`);
    body.push(`    body: ${p.body ?? M.unset}`);

  } else if (state.step === 'ai_prompt') {
    pushHeader(M.mode3Title);
    body.push(`  ${M.mode3Prompt}`);
    body.push('');
    body.push(`  ${M.mode3Examples}`);
    body.push(`    ${M.mode3Ex1}`);
    body.push(`    ${M.mode3Ex2}`);
    body.push(`    ${M.mode3Ex3}`);
    body.push('');
    body.push(`  ${M.mode3Note}`);

  } else if (state.step === 'manual') {
    pushHeader(M.mode4Title);
    body.push(`  ${M.mode4Prompt}`);
    body.push(`  ${M.mode4Limit}`);
    body.push('');
    body.push(`  ${M.mode3Examples}`);
    body.push(`    ${M.mode4Ex1}`);
    body.push('');
    body.push(`  ${M.mode4Note}`);

  } else if (state.step === 'personality') {
    pushHeader(M.personalityTitle);
    body.push(`  ${M.personalityPrompt}`);
    body.push('');
    for (const [, def] of Object.entries(PRESETS)) {
      body.push(`  ${def.id.padEnd(11)} ${def.label}`);
      body.push(`    ${def.description}`);
    }
    body.push('');
    body.push(`  ${M.personalityCustom}`);
    body.push('');
    body.push(`  → personality_preset: "..."`);

  } else if (state.step === 'stats') {
    pushHeader(M.statsTitle(STAT_POOL));
    const statsErr = args.stats ? validateStatDistribution(args.stats) : null;
    body.push(`  ${M.statsPrompt}`);
    body.push(`  ${M.statsLimit(STAT_MIN, STAT_MAX)}`);
    body.push('');
    for (const stat of STAT_NAMES) {
      const cur = args.stats?.[stat];
      body.push(`  ${stat.padEnd(12)} ${cur !== undefined ? String(cur) : M.unset}`);
    }
    if (statsErr && !statsErr.valid) {
      body.push('');
      body.push(`  ⚠ ${statsErr.error}`);
    }
    body.push('');
    body.push(`  ${M.statsExample}`);
  }

  return drawCard(body);
}

export function renderPreviewText(
  name: string,
  species: string,
  presetLabel: string,
  bio: string,
  stats: Record<string, number>,
  customFramePreview?: string[],
): string {
  const bioWidth = CARD_INNER - 4;

  const statLines = STAT_NAMES.map(s => {
    const val = Math.round(stats[s] ?? 0);
    const filled = Math.floor((val / 100) * 8);
    const bar = '█'.repeat(filled) + '░'.repeat(8 - filled);
    return `  ${s.padEnd(10)} ${bar}   ${String(val).padStart(2)}`;
  });

  const bioWords = bio.split(' ');
  const bioLines: string[] = [];
  let cur = '';
  for (const w of bioWords) {
    if (cur.length + w.length + 1 > bioWidth && cur) {
      bioLines.push(`   ${cur}`);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) bioLines.push(`   ${cur}`);

  const spriteLines = customFramePreview
    ? customFramePreview.map(l => `  ${l}`)
    : [];

  const body = [
    `★★ CUSTOM   ${species.toUpperCase()}`,
    '',
    ...(spriteLines.length > 0 ? [...spriteLines, ''] : []),
    `  ${name}  [★★ CUSTOM]`,
    `  ${presetLabel}`,
    '',
    ...bioLines,
    '',
    ...statLines,
  ];

  return drawCard(body);
}
