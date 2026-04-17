# bbuddy — 직접 만드는 코딩 컴패니언

[![test](https://img.shields.io/github/actions/workflow/status/gokomong/bbuddy/test.yml?branch=master&label=test)](https://github.com/gokomong/bbuddy/actions/workflows/test.yml)
[![node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)](./package.json)
[![tests](https://img.shields.io/badge/tests-315%20passing-brightgreen)](./src/__tests__)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> fiorastudio/buddy를 base로, **사용자가 직접 캐릭터를 만드는** 창작 레이어를 얹은 MCP 서버.

```
  /\_/\          ┌──────────────────────────────────────────┐
 ( ■.■ )  ─────▶ │ Mochi (Lv.7) · 츤데레                   │
  > ~ <          │ DEBUGGING ████████████████  40           │
 /|___|\ HaCk!  │ PATIENCE  ██████████        25           │
                 │ CHAOS     ████              10           │
                 └──────────────────────────────────────────┘
  AI가 만들어준 내 컴패니언
```

기존 buddy 프로젝트들은 전부 **"정해진 종족에서 배정/선택"** 구조다.  
bbuddy만의 차별점: **종족·외형·성격·스탯을 사용자가 처음부터 직접 만든다.**

---

## 목차

- [설치](#설치)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [Phase별 구현 내역](#phase별-구현-내역)
  - [Phase 1 — 리네이밍 + Creator MVP](#phase-1--리네이밍--creator-mvp)
  - [Phase 2 — 외형 창작 시스템](#phase-2--외형-창작-시스템)
  - [Phase 3 — Claude Code 심화 통합](#phase-3--claude-code-심화-통합)
  - [Phase 4 — Codex CLI 확장](#phase-4--codex-cli-확장)
- [MCP 도구 레퍼런스](#mcp-도구-레퍼런스)
- [Wizard 플로우](#wizard-플로우)
- [Hooks](#hooks)
- [Skills](#skills)
- [파일 구조](#파일-구조)

---

## 설치

### 원클릭 설치 (권장)

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/gokomong/bbuddy/master/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/gokomong/bbuddy/master/install.ps1 | iex
```

설치 스크립트가 자동으로 처리하는 것:
- MCP 서버 빌드 (`~/.bbuddy/server/`)
- Claude Code / Cursor / Windsurf / Codex CLI MCP 등록
- Claude Code hooks 등록 (SessionStart, Stop, Pre/PostToolUse)
- Skills 설치 (`/bbuddy:create` 등)
- Statusline 설정
- 각 CLI 프롬프트 파일에 컴패니언 지시문 주입

### 수동 설치

```bash
git clone https://github.com/gokomong/bbuddy.git ~/.bbuddy/server
cd ~/.bbuddy/server
npm install && npm run build
```

`~/.claude/settings.json` 에 추가:
```json
{
  "mcpServers": {
    "bbuddy": {
      "command": "node",
      "args": ["~/.bbuddy/server/dist/server/index.js"]
    }
  }
}
```

---

## 빠른 시작

### 컴패니언 만들기

새 Claude Code 세션에서:

```
bbuddy_create 도구 호출
또는 /bbuddy:create 입력
```

wizard가 단계별로 안내한다:

```
[1/5] 이름 짓기       → "Mochi"
[2/5] 외형 선택       → 1종족 / 2파츠조합 / 3AI생성 / 4직접타이핑
[3/5] 성격 설정       → 츤데레 / 열정적 / 냉정한 / 장난꾸러기 / 현자 / 커스텀
[4/5] 스탯 분배       → 100pt를 5개 스탯에 자유 배분
[5/5] 확인 & 저장     → 프리뷰 카드 → confirm: true
```

### 상태 확인

```
bbuddy_status
/bbuddy:show
```

### Statusline 설정

원클릭 설치 스크립트가 shell RC 파일(`~/.zshrc` / `~/.bashrc` /
PowerShell `$PROFILE`)에 다음 환경변수를 추가해 자동 설정한다:

```bash
export CLAUDE_CODE_STATUSLINE_CMD="node $HOME/.bbuddy/server/dist/statusline-wrapper.js"
```

수동 설정을 원하면 같은 줄을 shell RC에 직접 붙여넣으면 된다.
Claude Code는 세션 시작 시 이 환경변수를 읽어 statusline 렌더러로 사용한다.
`settings.json`에는 관련 필드가 없다.

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│              bbuddy creator layer            │  ← 이번에 만든 것
│                                             │
│  wizard   AI생성기   파츠조합   직접입력      │
│  성격설정  스탯분배  커스텀스프라이트 관리     │
└──────────────────────┬──────────────────────┘
                       │ fork + extends
┌──────────────────────┴──────────────────────┐
│           fiorastudio/buddy (base)          │
│                                             │
│  MCP Server    SQLite    21종 스프라이트     │
│  XP/레벨       Observer  메모리/꿈           │
│  Rarity/스탯   StatusLine  설치스크립트      │
└─────────────────────────────────────────────┘
                       │ runs on
┌──────────────────────┴──────────────────────┐
│  Claude Code  Cursor  Windsurf  Codex CLI   │
└─────────────────────────────────────────────┘
```

### 기술 스택

| 영역 | 선택 |
|------|------|
| 런타임 | Node.js 18+ / TypeScript (NodeNext) |
| DB | SQLite (better-sqlite3) at `~/.bbuddy/bbuddy.db` |
| MCP | @modelcontextprotocol/sdk |
| AI ASCII 생성 | Anthropic API (claude-haiku-4-5) |
| 테스트 | Vitest (315 tests) |
| 빌드 | tsc |

---

## Phase별 구현 내역

### Phase 1 — 리네이밍 + Creator MVP

**커밋:** `0277f22`

fiorastudio/buddy를 fork해서 bbuddy로 리브랜딩하고 기본 Creator 레이어를 얹었다.

#### 변경 파일

**`package.json`**
- `@fiorastudio/buddy` → `bbuddy`
- bin: `buddy-statusline` → `bbuddy-statusline`

**`src/db/schema.ts`**
- DB 경로: `~/.buddy/buddy.db` → `~/.bbuddy/bbuddy.db`
- 기존 DB 자동 마이그레이션 (구 경로 감지 시 복사)
- companions 테이블 컬럼 추가:
  ```sql
  creation_mode TEXT DEFAULT 'hatched'   -- 'hatched' | 'created'
  personality_preset TEXT
  custom_prompt TEXT
  stats_mode TEXT DEFAULT 'rolled'       -- 'rolled' | 'manual'
  rarity TEXT
  eye TEXT
  hat TEXT
  stats_json TEXT
  ```

**`src/lib/types.ts`**
- `PERSONALITY_PRESETS`, `PersonalityPreset` 타입 추가
- `Companion` 타입에 optional 필드 추가 (비파괴적)

**`src/server/index.ts`**
- 도구 9개 전부 `buddy_*` → `bbuddy_*`
- 리소스 URI `buddy://` → `bbuddy://`
- `loadCompanion()`: `creation_mode === 'created'` 분기 추가
- `bbuddy_create` MCP 도구 추가 (모드 1: 종족 선택)

**신규 파일**

| 파일 | 역할 |
|------|------|
| `src/creator/presets.ts` | 성격 프리셋 6종 + `generatePresetBio()` |
| `src/creator/stats.ts` | `validateStatDistribution()`, `normaliseStats()`, STAT_POOL=100 |
| `src/creator/wizard.ts` | `evaluateWizardState()` — 단계별 상태 계산 |
| `src/creator/index.ts` | re-export |
| `src/__tests__/creator.test.ts` | 23개 테스트 |

---

### Phase 2 — 외형 창작 시스템

**커밋:** `42a7547`

Wizard에 `appearance_mode` 분기를 추가하고 3가지 외형 생성 방식을 구현했다.

#### 외형 모드 4종

**모드 1: 기본 종족**  
기존 21종 중 선택. 해시 기반 bones(rarity/stats/eye/hat)는 그대로 유지.

**모드 2: 파츠 조합** (`src/creator/parts-combiner.ts`)
```
얼굴: round / square / pointy / blob
눈:   · o O > ^ ♥ x ■ (또는 직접 입력)
악세: hat / crown / horns / ears / halo / antenna / bow / none
몸통: arms / tiny / legs / tail / float / none
```
- `parts.json`에서 파츠 데이터 로드 (`{E}` 플레이스홀더로 눈 위치 표시)
- 3개 idle 프레임 자동 생성: `·` (기본), `-` (깜빡), `^` (윙크)
- happy/sad/working 프레임 자동 파생

**모드 3: AI 생성** (호스트 LLM에 위임)
```
별도 API 키 불필요 — 호스트(Claude Code / Codex)가 직접 그림
서버는 제약과 다음 호출 템플릿을 텍스트로 반환
호스트 LLM이 프레임 3개를 생성해 bbuddy_create를 manual_frame1/2/3로 재호출
내부적으로는 모드 4와 동일한 parseManualInput 경로를 탄다
```

**모드 4: 직접 타이핑** (`src/creator/manual-input.ts`)
```
frame1 필수 (줄바꿈 \n으로 구분), frame2/frame3 선택
최대 6줄 × 14자 트리밍
frame2 생략 시 눈 변환으로 자동 생성
```

#### DB 확장

```sql
CREATE TABLE IF NOT EXISTS custom_sprites (
  companion_id  TEXT PRIMARY KEY,
  idle_frames   TEXT NOT NULL,   -- JSON: string[][]
  happy_frame   TEXT,
  sad_frame     TEXT,
  working_frame TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(companion_id) REFERENCES companions(id)
);
```

#### 새 MCP 도구

**`bbuddy_evolve`** — 기존 컴패니언 외형 변경  
이름·성격·스탯은 유지, 스프라이트만 교체. 모드 2/3/4 모두 지원.

#### Statusline 연동

`writeBuddyStatus()`가 `custom_sprites` 테이블을 조회해서  
`custom_idle_frames`를 status JSON에 포함 →  
`statusline-wrapper.ts`가 이 프레임을 우선 사용하고 없으면 기본 종족 스프라이트로 fallback.

---

### Phase 3 — Claude Code 심화 통합

**커밋:** `0cdaa5b`

#### Hooks

| 파일 | 이벤트 | 역할 |
|------|--------|------|
| `hooks/session-start.mjs` | SessionStart | status 파일 읽기 → 컴패니언 컨텍스트를 Claude 시스템 프롬프트에 주입. 없으면 생성 안내 |
| `hooks/stop.mjs` | Stop | 대화 transcript에서 `<!-- bbuddy: ... -->` 추출 → status JSON에 reaction 저장 |
| `hooks/pre-tool-use.mjs` | PreToolUse(Bash) | working 상태 설정 (⚙ 인디케이터) |
| `hooks/post-tool-use.mjs` | PostToolUse(Bash) | exit code 감지: 성공 → excited(★), 실패 → concerned(>.<) |

`~/.claude/settings.json`에 자동 등록:
```json
{
  "hooks": {
    "SessionStart": [{ "type": "command", "command": "node .../session-start.mjs" }],
    "Stop":         [{ "type": "command", "command": "node .../stop.mjs" }],
    "PreToolUse":   [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node .../pre-tool-use.mjs" }] }],
    "PostToolUse":  [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node .../post-tool-use.mjs" }] }]
  }
}
```

#### `<!-- bbuddy: -->` 코멘트 시스템

SessionStart hook이 주입하는 규칙:
```
의미 있는 순간(에러/성공/리팩토링)에 응답 맨 끝에
<!-- bbuddy: {15자 이내 반응} -->
을 붙여라.
```

Stop hook이 이 코멘트를 수거 → statusline 말풍선에 표시.

#### Skills

| 커맨드 | 파일 | 역할 |
|--------|------|------|
| `/bbuddy:create`  | `skills/create/SKILL.md`  | wizard 플로우 안내, bbuddy_create 호출 |
| `/bbuddy:show`    | `skills/show/SKILL.md`    | bbuddy_status 호출 |
| `/bbuddy:pet`     | `skills/pet/SKILL.md`     | bbuddy_pet 호출 |
| `/bbuddy:stats`   | `skills/stats/SKILL.md`   | 스탯 카드 표시 |
| `/bbuddy:rename`  | `skills/rename/SKILL.md`  | 이름 변경 플로우 |
| `/bbuddy:evolve`  | `skills/evolve/SKILL.md`  | 외형 변경 wizard |
| `/bbuddy:off`     | `skills/off/SKILL.md`     | bbuddy_mute |
| `/bbuddy:on`      | `skills/on/SKILL.md`      | bbuddy_unmute |
| `/bbuddy:save`    | `skills/save/SKILL.md`    | 현재 컴패니언을 슬롯에 저장 |
| `/bbuddy:list`    | `skills/list/SKILL.md`    | 저장된 슬롯 목록 |
| `/bbuddy:summon`  | `skills/summon/SKILL.md`  | 슬롯에서 컴패니언 소환 (현재 컴패니언은 `__previous`로 백업) |
| `/bbuddy:dismiss` | `skills/dismiss/SKILL.md` | 슬롯 삭제 |
| `/bbuddy:language`| `skills/language/SKILL.md`| UI 언어 전환 (`en` / `ko`) |

#### Plugin 매니페스트

`.claude-plugin/plugin.json` — Claude Code 플러그인 등록 정보.

---

### Phase 4 — Codex CLI 확장

**커밋:** `ce0e1d8`

Codex는 커스텀 statusline을 지원하지 않기 때문에  
**Stop hook의 stdout**으로 스프라이트를 렌더링하는 방식으로 대응.

| 파일 | 역할 |
|------|------|
| `hooks/codex-session-start.mjs` | 영문 포맷 컴패니언 컨텍스트 주입 |
| `hooks/codex-stop.mjs` | transcript 파싱 + ANSI 스프라이트 stdout 렌더링 |
| `.codex-plugin/plugin.json` | Codex 플러그인 매니페스트 |

`codex-stop.mjs`는 status 파일에서 프레임을 읽어 ANSI 컬러로 직접 출력한다:
```
  /\_/\   Mochi (Custom, Lv.7)
 ( ■.■ )  happy  XP:420
  > ~ <   "버그 잡았어!"
 /|___|\ 
```

Pre/PostToolUse는 Claude Code용 훅(`pre-tool-use.mjs`, `post-tool-use.mjs`)을 그대로 공유.

---

## MCP 도구 레퍼런스

### 기존 도구 (fiorastudio/buddy에서 리네이밍)

| 도구 | 설명 |
|------|------|
| `bbuddy_hatch` | 해시 기반 랜덤 컴패니언 생성 |
| `bbuddy_status` | 컴패니언 카드 표시 |
| `bbuddy_observe` | 작업 보고 → XP 획득 + 반응 |
| `bbuddy_pet` | 쓰다듬기 → 기분 상승 |
| `bbuddy_remember` | 메모리 저장 |
| `bbuddy_dream` | 꿈 생성 |
| `bbuddy_mute` | Observer 음소거 |
| `bbuddy_unmute` | 음소거 해제 |
| `bbuddy_respawn` | 컴패니언 리셋 |

### 신규 도구 (bbuddy 추가)

| 도구 | 설명 |
|------|------|
| `bbuddy_create` | Wizard 기반 컴패니언 생성 (모드 1~4) |
| `bbuddy_evolve` | 기존 컴패니언 외형 변경 |
| `bbuddy_save` | 현재 컴패니언을 슬롯에 저장 |
| `bbuddy_list` | 저장된 슬롯 나열 |
| `bbuddy_summon` | 슬롯에서 컴패니언 소환 (현재 컴패니언은 `__previous`로 자동 백업) |
| `bbuddy_dismiss` | 슬롯 삭제 |
| `bbuddy_language` | UI 언어 전환 (`en` / `ko`) |

---

## Wizard 플로우

`bbuddy_create` / `bbuddy_evolve`는 **single-call stateless** 방식이다.  
파라미터가 불완전하면 다음 단계 안내 텍스트를 반환하고,  
전부 채우고 `confirm: true`를 넣으면 저장한다.

```
name
  └─▶ appearance_mode
        ├─ "1" ─▶ species ──────────────────────┐
        ├─ "2" ─▶ parts (face/eye/accessory/body)┤
        ├─ "3" ─▶ ai_prompt ────────────────────┤
        └─ "4" ─▶ manual_frame1 ────────────────┘
                                                 │
                                          personality_preset
                                                 │
                                               stats
                                                 │
                                            confirm: true
                                                 │
                                           ✅ 저장 완료
```

### 파라미터 전체

```typescript
bbuddy_create({
  name: string,
  appearance_mode: "1" | "2" | "3" | "4",

  // 모드 1
  species?: string,                         // 21종 중 하나

  // 모드 2
  parts?: {
    face: "round" | "square" | "pointy" | "blob",
    eye: string,                            // "·" "o" "♥" 등
    accessory: "hat" | "crown" | "horns" | "ears" | "halo" | "antenna" | "bow" | "none",
    body: "arms" | "tiny" | "legs" | "tail" | "float" | "none",
  },

  // 모드 3
  ai_prompt?: string,                       // "선글라스 고양이" 등

  // 모드 4
  manual_frame1?: string,                   // "\n"으로 줄 구분
  manual_frame2?: string,
  manual_frame3?: string,

  // 공통
  personality_preset?: "tsundere" | "passionate" | "cold" | "prankster" | "sage" | "custom",
  custom_prompt?: string,                   // personality_preset === "custom"일 때
  stats?: {
    DEBUGGING: number,  // 합계 100, 각 1~80
    PATIENCE: number,
    CHAOS: number,
    WISDOM: number,
    SNARK: number,
  },
  confirm?: boolean,
})
```

---

## Hooks

### 등록 위치

- **Claude Code**: `~/.claude/settings.json` → `hooks`
- **Codex**: `~/.codex/settings.json` → `hooks`

### 반응 시스템

status JSON(`~/.claude/bbuddy-status.json`)의 reaction 필드:

```typescript
{
  reaction: "excited" | "concerned" | "working" | "chime",
  reaction_expires: number,      // ms timestamp
  reaction_eye: string,          // eye override (★, >.<)
  reaction_indicator: string,    // name 옆 표시 (!, ...)
  reaction_text: string,         // 말풍선 텍스트
}
```

| 트리거 | reaction | eye | 텍스트 |
|--------|----------|-----|--------|
| Bash 성공 | excited | ★ | 잘됐다! / 굿! / 완료! |
| Bash 실패 | concerned | >.< | 괜찮아... / 다시 해봐 |
| Bash 실행 중 | working | (유지) | — |
| Claude 반응 코멘트 | chime | (유지) | <!-- bbuddy: ... --> 내용 |

---

## Skills

Claude Code에서 `/bbuddy:` 로 시작하는 커맨드로 호출.  
각 SKILL.md가 Claude에게 어떤 MCP 도구를 어떻게 호출할지 지시한다.

```bash
/bbuddy:create   # 컴패니언 생성 wizard
/bbuddy:show     # 상태 카드
/bbuddy:pet      # 쓰다듬기
/bbuddy:stats    # 스탯 상세
/bbuddy:rename   # 이름 변경
/bbuddy:evolve   # 외형 변경
/bbuddy:off      # 음소거
/bbuddy:on       # 음소거 해제
```

---

## 파일 구조

```
bbuddy/
├── src/
│   ├── server/
│   │   └── index.ts              # MCP 서버 (10개 도구, 3개 리소스)
│   ├── creator/                  # ← bbuddy 신규
│   │   ├── presets.ts            # 성격 프리셋 6종
│   │   ├── stats.ts              # 스탯 분배 검증
│   │   ├── wizard.ts             # Wizard 상태 계산
│   │   ├── parts-combiner.ts     # 파츠 조합 → CustomSprite
│   │   ├── ai-generator.ts       # Anthropic API → ASCII 아트
│   │   ├── manual-input.ts       # 자유 입력 → CustomSprite
│   │   ├── sprites/parts.json    # 파츠 데이터
│   │   └── index.ts              # re-export
│   ├── db/schema.ts              # SQLite 스키마 + 마이그레이션
│   ├── lib/                      # base에서 상속
│   │   ├── types.ts
│   │   ├── species.ts
│   │   ├── observer.ts
│   │   └── ...
│   ├── statusline-wrapper.ts     # 터미널 상태바 렌더러
│   └── __tests__/
│       ├── creator.test.ts       # Phase 1 테스트 (23개)
│       └── creator-phase2.test.ts # Phase 2 테스트 (28개)
│
├── hooks/                        # ← bbuddy 신규
│   ├── session-start.mjs         # Claude Code: 시스템 프롬프트 주입
│   ├── stop.mjs                  # Claude Code: 반응 코멘트 수거
│   ├── pre-tool-use.mjs          # 공용: working 상태 설정
│   ├── post-tool-use.mjs         # 공용: 성공/실패 반응
│   ├── codex-session-start.mjs   # Codex: 영문 컨텍스트 주입
│   └── codex-stop.mjs            # Codex: stdout 스프라이트 렌더링
│
├── skills/                       # ← bbuddy 신규 (18 slash commands)
│   ├── create/ show/ pet/ stats/ rename/ evolve/
│   ├── off/ on/ hatch/ respawn/ observe/ remember/ dream/
│   └── save/ list/ summon/ dismiss/ language/
│
├── .claude-plugin/plugin.json    # Claude Code 플러그인 매니페스트
├── .codex-plugin/plugin.json     # Codex 플러그인 매니페스트
├── install.sh                    # macOS/Linux 설치 스크립트
├── install.ps1                   # Windows 설치 스크립트
└── package.json
```

---

## 환경변수

별도의 환경변수가 필요 없습니다. 모드 3(AI 생성)은 호스트 LLM(Claude Code / Codex)에 위임하므로 별도의 API 키를 요구하지 않습니다.

---

## 테스트

```bash
npm test          # 315개 테스트 실행
npm run build     # TypeScript 컴파일
```

---

## Credits

Forked from [**fiorastudio/buddy**](https://github.com/fiorastudio/buddy) —
the original MCP companion project (18 species, MCP server scaffolding,
statusline renderer, XP / dream / evolution systems). bbuddy is a
fork, not a rewrite; the base hatching/status/presence logic is
unchanged.

What bbuddy adds on top:
- **Creator system** — 4-mode wizard (species / parts / AI delegate /
  manual ASCII), 6 personality presets, 100-pt stat distribution,
  `custom_sprites` table
- **Slots** — `bbuddy_save / list / summon / dismiss`, automatic
  `__previous` backup on swap
- **i18n** — English default with Korean opt-in (`bbuddy_language`)
- **Tool-driven creation wizard** — framed `.______.` card rendered
  by the MCP tool itself (no LLM-scripted conversation)
- **Statusline hardening** — stable anchor across reaction state,
  terminal-width auto-detect (tmux / WezTerm / kitty / stty), CJK
  visual-width math, zero HUD-plugin dependencies
- **Codex CLI extension** — Codex-specific hooks with ANSI sprite
  rendering via stdout

Licensed MIT — compatible with upstream. See [LICENSE](./LICENSE).

---

## 라이선스

MIT
