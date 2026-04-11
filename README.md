# bbddy — 직접 만드는 코딩 컴패니언

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
bbddy만의 차별점: **종족·외형·성격·스탯을 사용자가 처음부터 직접 만든다.**

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
curl -fsSL https://raw.githubusercontent.com/gokomong/bbddy/master/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/gokomong/bbddy/master/install.ps1 | iex
```

설치 스크립트가 자동으로 처리하는 것:
- MCP 서버 빌드 (`~/.bbddy/server/`)
- Claude Code / Cursor / Windsurf / Codex CLI MCP 등록
- Claude Code hooks 등록 (SessionStart, Stop, Pre/PostToolUse)
- Skills 설치 (`/bbddy:create` 등)
- Statusline 설정
- 각 CLI 프롬프트 파일에 컴패니언 지시문 주입

### 수동 설치

```bash
git clone https://github.com/gokomong/bbddy.git ~/.bbddy/server
cd ~/.bbddy/server
npm install && npm run build
```

`~/.claude/settings.json` 에 추가:
```json
{
  "mcpServers": {
    "bbddy": {
      "command": "node",
      "args": ["~/.bbddy/server/dist/server/index.js"]
    }
  }
}
```

---

## 빠른 시작

### 컴패니언 만들기

새 Claude Code 세션에서:

```
bbddy_create 도구 호출
또는 /bbddy:create 입력
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
bbddy_status
/bbddy:show
```

### Statusline 설정

Claude Code settings에서:
```json
"statusLineCmd": "node ~/.bbddy/server/dist/statusline-wrapper.js"
```

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│              bbddy creator layer            │  ← 이번에 만든 것
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
| DB | SQLite (better-sqlite3) at `~/.bbddy/bbddy.db` |
| MCP | @modelcontextprotocol/sdk |
| AI ASCII 생성 | Anthropic API (claude-haiku-4-5) |
| 테스트 | Vitest (294 tests) |
| 빌드 | tsc |

---

## Phase별 구현 내역

### Phase 1 — 리네이밍 + Creator MVP

**커밋:** `0277f22`

fiorastudio/buddy를 fork해서 bbddy로 리브랜딩하고 기본 Creator 레이어를 얹었다.

#### 변경 파일

**`package.json`**
- `@fiorastudio/buddy` → `bbddy`
- bin: `buddy-statusline` → `bbddy-statusline`

**`src/db/schema.ts`**
- DB 경로: `~/.buddy/buddy.db` → `~/.bbddy/bbddy.db`
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
- 도구 9개 전부 `buddy_*` → `bbddy_*`
- 리소스 URI `buddy://` → `bbddy://`
- `loadCompanion()`: `creation_mode === 'created'` 분기 추가
- `bbddy_create` MCP 도구 추가 (모드 1: 종족 선택)

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

**모드 3: AI 생성** (`src/creator/ai-generator.ts`)
```
ANTHROPIC_API_KEY 필요
모델: claude-haiku-4-5-20251001
출력: idle 3프레임 + happy/sad/working 각 1프레임
실패 시: null 반환 → 호출자가 fallback 안내
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

**`bbddy_evolve`** — 기존 컴패니언 외형 변경  
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
| `hooks/stop.mjs` | Stop | 대화 transcript에서 `<!-- bbddy: ... -->` 추출 → status JSON에 reaction 저장 |
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

#### `<!-- bbddy: -->` 코멘트 시스템

SessionStart hook이 주입하는 규칙:
```
의미 있는 순간(에러/성공/리팩토링)에 응답 맨 끝에
<!-- bbddy: {15자 이내 반응} -->
을 붙여라.
```

Stop hook이 이 코멘트를 수거 → statusline 말풍선에 표시.

#### Skills

| 커맨드 | 파일 | 역할 |
|--------|------|------|
| `/bbddy:create` | `skills/create/SKILL.md` | wizard 플로우 안내, bbddy_create 호출 |
| `/bbddy:show`   | `skills/show/SKILL.md`   | bbddy_status 호출 |
| `/bbddy:pet`    | `skills/pet/SKILL.md`    | bbddy_pet 호출 |
| `/bbddy:stats`  | `skills/stats/SKILL.md`  | 스탯 카드 표시 |
| `/bbddy:rename` | `skills/rename/SKILL.md` | 이름 변경 플로우 |
| `/bbddy:evolve` | `skills/evolve/SKILL.md` | 외형 변경 wizard |
| `/bbddy:off`    | `skills/off/SKILL.md`    | bbddy_mute |
| `/bbddy:on`     | `skills/on/SKILL.md`     | bbddy_unmute |

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
| `bbddy_hatch` | 해시 기반 랜덤 컴패니언 생성 |
| `bbddy_status` | 컴패니언 카드 표시 |
| `bbddy_observe` | 작업 보고 → XP 획득 + 반응 |
| `bbddy_pet` | 쓰다듬기 → 기분 상승 |
| `bbddy_remember` | 메모리 저장 |
| `bbddy_dream` | 꿈 생성 |
| `bbddy_mute` | Observer 음소거 |
| `bbddy_unmute` | 음소거 해제 |
| `bbddy_respawn` | 컴패니언 리셋 |

### 신규 도구 (bbddy 추가)

| 도구 | 설명 |
|------|------|
| `bbddy_create` | Wizard 기반 컴패니언 생성 (모드 1~4) |
| `bbddy_evolve` | 기존 컴패니언 외형 변경 |

---

## Wizard 플로우

`bbddy_create` / `bbddy_evolve`는 **single-call stateless** 방식이다.  
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
bbddy_create({
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

status JSON(`~/.claude/bbddy-status.json`)의 reaction 필드:

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
| Claude 반응 코멘트 | chime | (유지) | <!-- bbddy: ... --> 내용 |

---

## Skills

Claude Code에서 `/bbddy:` 로 시작하는 커맨드로 호출.  
각 SKILL.md가 Claude에게 어떤 MCP 도구를 어떻게 호출할지 지시한다.

```bash
/bbddy:create   # 컴패니언 생성 wizard
/bbddy:show     # 상태 카드
/bbddy:pet      # 쓰다듬기
/bbddy:stats    # 스탯 상세
/bbddy:rename   # 이름 변경
/bbddy:evolve   # 외형 변경
/bbddy:off      # 음소거
/bbddy:on       # 음소거 해제
```

---

## 파일 구조

```
bbddy/
├── src/
│   ├── server/
│   │   └── index.ts              # MCP 서버 (10개 도구, 3개 리소스)
│   ├── creator/                  # ← bbddy 신규
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
├── hooks/                        # ← bbddy 신규
│   ├── session-start.mjs         # Claude Code: 시스템 프롬프트 주입
│   ├── stop.mjs                  # Claude Code: 반응 코멘트 수거
│   ├── pre-tool-use.mjs          # 공용: working 상태 설정
│   ├── post-tool-use.mjs         # 공용: 성공/실패 반응
│   ├── codex-session-start.mjs   # Codex: 영문 컨텍스트 주입
│   └── codex-stop.mjs            # Codex: stdout 스프라이트 렌더링
│
├── skills/                       # ← bbddy 신규
│   ├── create/SKILL.md
│   ├── show/SKILL.md
│   ├── pet/SKILL.md
│   ├── stats/SKILL.md
│   ├── rename/SKILL.md
│   ├── evolve/SKILL.md
│   ├── off/SKILL.md
│   └── on/SKILL.md
│
├── .claude-plugin/plugin.json    # Claude Code 플러그인 매니페스트
├── .codex-plugin/plugin.json     # Codex 플러그인 매니페스트
├── install.sh                    # macOS/Linux 설치 스크립트
├── install.ps1                   # Windows 설치 스크립트
└── package.json
```

---

## 환경변수

| 변수 | 용도 | 필수 |
|------|------|------|
| `ANTHROPIC_API_KEY` | AI ASCII 생성 (모드 3) | 모드 3 사용 시 |

---

## 테스트

```bash
npm test          # 294개 테스트 실행
npm run build     # TypeScript 컴파일
```

---

## 라이선스

MIT
