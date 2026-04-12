// Server-facing message catalog. These strings come back to the user as MCP
// tool responses or slash-command output. Bio templates and observer tone
// prompts live in creator/presets.ts because they feed the LLM directly.

import { getLang, type Lang } from './index.js';

export const SERVER_STRINGS = {
  en: {
    // bbddy_create / bbddy_evolve — AI delegation prompt
    aiHeader: (tool: string) => `🎨 AI mode — the host model draws the ASCII art directly.`,
    aiDescription: (description: string) => `Character: "${description}"`,
    aiConstraints: 'Constraints:',
    aiConstraint1: '- Max 6 rows, max 14 chars per row',
    aiConstraint2: '- ASCII + unicode only (avoid emoji)',
    aiConstraint3: '- frame1 = idle, frame2 = blink/wink, frame3 = expression (wiggle/stretch, etc.)',
    aiConstraint4: '- All three frames share the same silhouette; only small details (eye/mouth/arm) differ',
    aiNext: (tool: string) => `Next: build 3 frames matching the constraints above, then call ${tool} again like this:`,
    aiFrameHint: 'Frame strings accept real newlines or "\\n" escape sequences.',
    aiConfirmHint: 'Omit confirm to see a preview first.',

    previewAsk: 'Happy with this buddy? Call the tool again with confirm: true to finalize. Change params and re-call to go back.',
    existingCompanion: 'A companion already exists. Call bbddy_respawn first, then try again.',
    evolvePreview: (lines: string) => `New appearance preview:\n\n${lines}\n\nCall again with confirm: true to apply.`,
    evolveDone: (name: string, species: string) => `✨ ${name}'s appearance changed! (${species})`,

    slotNameRequired: '⚠ slot name is required.',
    slotNameLength: '⚠ slot name must be 1–24 characters.',
    slotReserved: "⚠ slots starting with '__' are reserved for internal use.",
    noCompanionToSave: 'No companion to save. Run bbddy_hatch or bbddy_create first.',
    slotSaved: (name: string, slot: string) => `💾 "${name}" saved to slot "${slot}".`,
    slotMissing: (slot: string) => `Slot "${slot}" not found. Run bbddy_list to see available slots.`,
    summoned: (name: string, slot: string) => `✨ "${name}" summoned from slot "${slot}". (previous companion backed up to '__previous')`,
    slotDeleted: (slot: string) => `🗑 Slot "${slot}" deleted.`,
    slotDeleteMissing: (slot: string) => `Slot "${slot}" does not exist.`,

    noSlotsHeader: 'Saved bbddy slots:',
    noSlots: 'No saved slots yet. Use bbddy_save to save the current companion.',
    slotLine: (slot: string, tag: string, name: string, species: string, level: number, savedAt: string) =>
      `  • ${slot}${tag} — ${name} (${species}) Lv.${level}  · ${savedAt}`,
    slotListFooter: 'Use bbddy_summon { slot: "<name>" } to load a slot.',
    slotAutoBackupTag: ' (auto-backup)',
    slotCorrupted: '(corrupted)',

    languageSet: (lang: Lang) => `Language set to ${lang === 'en' ? 'English' : 'Korean'}.`,
    languageCurrent: (lang: Lang) => `Current language: ${lang === 'en' ? 'English' : 'Korean'} (use bbddy_language { lang: "en" | "ko" } to change)`,
    languageInvalid: '⚠ Unsupported language. Use "en" or "ko".',
  },
  ko: {
    aiHeader: (tool: string) => `🎨 AI 모드 — 호스트 모델이 직접 ASCII 아트를 그립니다.`,
    aiDescription: (description: string) => `캐릭터 설명: "${description}"`,
    aiConstraints: '제약:',
    aiConstraint1: '- 최대 6줄, 줄당 최대 14자',
    aiConstraint2: '- ASCII + 유니코드 문자만 사용 (이모지는 지양)',
    aiConstraint3: '- frame1 = idle, frame2 = blink/wink, frame3 = expression (wiggle/stretch 등)',
    aiConstraint4: '- 세 프레임 모두 같은 실루엣, 눈/입/팔 같은 세부만 살짝 다르게',
    aiNext: (tool: string) => `다음 단계: 위 제약에 맞게 3개 프레임을 만들고, 바로 ${tool}을 아래 형태로 다시 호출하세요:`,
    aiFrameHint: '프레임 문자열에는 실제 줄바꿈 또는 "\\n" 이스케이프 시퀀스를 써도 됩니다.',
    aiConfirmHint: 'confirm을 붙이지 않으면 미리보기만 보여줍니다.',

    previewAsk: '캐릭터가 마음에 드시나요? confirm: true 로 호출하면 확정됩니다. 뒤로 가려면 파라미터를 수정해서 다시 호출하세요.',
    existingCompanion: '이미 companion이 있습니다. bbddy_respawn으로 해제한 뒤 다시 시도하세요.',
    evolvePreview: (lines: string) => `새 외형 미리보기:\n\n${lines}\n\nconfirm: true 로 적용하세요.`,
    evolveDone: (name: string, species: string) => `✨ ${name}의 외형이 바뀌었습니다! (${species})`,

    slotNameRequired: '⚠ slot 이름이 필요합니다.',
    slotNameLength: '⚠ slot 이름은 1–24자여야 합니다.',
    slotReserved: "⚠ '__'로 시작하는 슬롯은 내부 예약입니다.",
    noCompanionToSave: '저장할 companion이 없습니다. bbddy_hatch 또는 bbddy_create로 먼저 만드세요.',
    slotSaved: (name: string, slot: string) => `💾 "${name}"이(가) 슬롯 "${slot}"에 저장되었습니다.`,
    slotMissing: (slot: string) => `슬롯 "${slot}"이(가) 없습니다. bbddy_list로 사용 가능한 슬롯을 확인하세요.`,
    summoned: (name: string, slot: string) => `✨ "${name}"이(가) 슬롯 "${slot}"에서 소환되었습니다. (이전 companion은 '__previous'에 백업됨)`,
    slotDeleted: (slot: string) => `🗑 슬롯 "${slot}" 삭제 완료.`,
    slotDeleteMissing: (slot: string) => `슬롯 "${slot}"이(가) 없습니다.`,

    noSlotsHeader: '저장된 bbddy 슬롯:',
    noSlots: '저장된 슬롯이 없습니다. bbddy_save로 현재 companion을 저장하세요.',
    slotLine: (slot: string, tag: string, name: string, species: string, level: number, savedAt: string) =>
      `  • ${slot}${tag} — ${name} (${species}) Lv.${level}  · ${savedAt}`,
    slotListFooter: 'bbddy_summon { slot: "<name>" } 으로 불러오세요.',
    slotAutoBackupTag: ' (자동 백업)',
    slotCorrupted: '(손상됨)',

    languageSet: (lang: Lang) => `언어가 ${lang === 'ko' ? '한국어' : '영어'}로 설정되었습니다.`,
    languageCurrent: (lang: Lang) => `현재 언어: ${lang === 'ko' ? '한국어' : '영어'} (변경하려면 bbddy_language { lang: "en" | "ko" })`,
    languageInvalid: '⚠ 지원하지 않는 언어입니다. "en" 또는 "ko"를 사용하세요.',
  },
};

export function serverMessages() {
  return SERVER_STRINGS[getLang()];
}
