# bbuddy — 직접 만드는 코딩 컴패니언

🌐 [English](./README.md) · **한국어**

[![test](https://img.shields.io/github/actions/workflow/status/gokomong/bbuddy/test.yml?branch=master&label=test)](https://github.com/gokomong/bbuddy/actions/workflows/test.yml)
[![node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)](./package.json)
[![tests](https://img.shields.io/badge/tests-315%20passing-brightgreen)](./src/__tests__)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

> Claude Code와 Codex CLI의 statusline에 거주하는 ASCII 코딩 컴패니언.
> [fiorastudio/buddy](https://github.com/fiorastudio/buddy)를 fork해서
> **사용자가 직접 캐릭터를 만드는** 창작 레이어를 얹었다 — 종족·외형·성격·스탯
> 전부 사용자가 결정한다.

```
  /\_/\          ┌──────────────────────────────────────────┐
 ( ■.■ )  ─────▶ │ Mochi (Lv.7) · 츤데레                    │
  > ~ <          │ DEBUGGING ████████████████  40           │
 /|___|\ HaCk!   │ PATIENCE  ██████████        25           │
                 │ CHAOS     ████              10           │
                 └──────────────────────────────────────────┘
  커스텀 컴패니언 · 100pt 스탯 예산 · 성격 프리셋 6종
```

기존 MCP 컴패니언 프로젝트들은 전부 **"정해진 종족에서 랜덤/선택"** 구조다.
bbuddy만의 차별점: **한 픽셀 단위까지 사용자가 만든다** — 또는 Claude한테 그려달라고 하거나.

---

## 목차

- [설치](#설치)
- [빠른 시작](#빠른-시작)
- [아키텍처](#아키텍처)
- [MCP 도구](#mcp-도구)
- [Wizard 플로우](#wizard-플로우)
- [Hooks](#hooks)
- [Skills](#skills)
- [파일 구조](#파일-구조)
- [테스트](#테스트)
- [Credits](#credits)
- [라이선스](#라이선스)

더 깊은 문서: [AGENTS.md](./AGENTS.md) (아키텍처 + 규약) ·
[HANDOFF.md](./HANDOFF.md) (세션별 의사결정 로그) ·
[CHANGELOG.md](./CHANGELOG.md) (릴리즈 히스토리) ·
[CONTRIBUTING.md](./CONTRIBUTING.md) (개발 루프).

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

설치 스크립트가 자동 처리하는 것:

- `~/.bbuddy/server/` 에 MCP 서버 빌드
- Claude Code / Cursor / Windsurf / Codex CLI에 MCP 서버 등록
- Claude Code hooks 등록 (SessionStart, Stop, Pre/PostToolUse)
- Slash command skills 복사 (`/bbuddy:create`, `:show`, `:pet`, …)
- shell RC 파일에 statusline 환경변수 주입
- 각 CLI 지시문 파일에 컴패니언 시스템 프롬프트 추가

**Bun**이 설치돼 있으면 자동 감지해서 사용 (`install` 5–10배 빠름).
네이티브 리빌드 실패 시 `npm`으로 폴백.

### 수동 설치

```bash
git clone https://github.com/gokomong/bbuddy.git ~/.bbuddy/server
cd ~/.bbuddy/server
npm install && npm run build      # 또는: bun install && bun run build
```

`~/.claude/settings.json` 에 추가:
```json
{
  "mcpServers": {
    "bbuddy": {
      "command": "node",
      "args": ["/절대/경로/.bbuddy/server/dist/server/index.js"]
    }
  }
}
```

Statusline은 shell RC 파일 (`~/.zshrc` / `~/.bashrc` / PowerShell
`$PROFILE`) 에 다음 한 줄 추가:
```bash
export CLAUDE_CODE_STATUSLINE_CMD="node $HOME/.bbuddy/server/dist/statusline-wrapper.js"
```

Claude Code는 세션 시작 시 이 환경변수를 읽어 statusline 렌더러로 사용한다.
`settings.json`에는 관련 필드가 없다.

---

## 빠른 시작

### 컴패니언 만들기

Claude Code 세션에서:

```
/bbuddy:create
```

Wizard가 단계별로 프레임 카드 렌더링:

```
[1/4] 이름 짓기       → "Mochi"
[2/4] 외형 모드 선택   → 1 종족 | 2 파츠 조합 | 3 AI 생성 | 4 직접 입력
[3/4] 성격 프리셋     → 츤데레 / 열정적 / 냉정한 / 장난꾸러기 / 현자 / 커스텀
[4/4] 스탯 분배       → DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK 에 100pt 배분
Preview → confirm: true → 저장 완료
```

### 상태 확인

```
/bbuddy:show
```

### 그 외 명령

`/bbuddy:pet`, `/bbuddy:stats`, `/bbuddy:evolve`, `/bbuddy:save <slot>`,
`/bbuddy:list`, `/bbuddy:summon <slot>`, `/bbuddy:dismiss <slot>`,
`/bbuddy:language en|ko`, `/bbuddy:off`, `/bbuddy:on`, `/bbuddy:respawn`.
전체 목록은 [Skills](#skills) 섹션.

---

## 아키텍처

```
┌─────────────────────────────────────────────┐
│              bbuddy creator layer           │
│                                             │
│  wizard   AI 위임   파츠 조합   직접 입력    │
│  성격 프리셋   스탯 분배   커스텀 스프라이트   │
└──────────────────────┬──────────────────────┘
                       │ fork + extends
┌──────────────────────┴──────────────────────┐
│          fiorastudio/buddy (base)           │
│                                             │
│   MCP 서버   SQLite   21종 스프라이트        │
│   XP / 레벨   Observer   메모리/꿈           │
│   Rarity / 스탯   Statusline 렌더러         │
└──────────────────────┬──────────────────────┘
                       │ runs on
┌──────────────────────┴──────────────────────┐
│   Claude Code · Cursor · Windsurf · Codex   │
└─────────────────────────────────────────────┘
```

### 기술 스택

| 영역 | 선택 |
|---|---|
| 런타임 | Node.js 20+ / TypeScript (NodeNext) — Bun 1.0+ 도 지원 |
| DB | SQLite (`better-sqlite3`) · `~/.bbuddy/bbuddy.db` |
| MCP | `@modelcontextprotocol/sdk` |
| AI ASCII 생성 | 호스트 LLM 위임 (API 키 불필요) |
| 테스트 | Vitest (315 passing) |
| 빌드 | `tsc` |

Phase 1–6 전체 히스토리는 [AGENTS.md §7](./AGENTS.md) 와
[CHANGELOG.md](./CHANGELOG.md) 참고.

---

## MCP 도구

| 도구 | 설명 |
|---|---|
| `bbuddy_create` | Wizard 기반 컴패니언 생성 (모드 1~4) |
| `bbuddy_hatch` | 해시 기반 랜덤 컴패니언 (21종 중) |
| `bbuddy_status` | 컴패니언 카드 렌더 |
| `bbuddy_pet` | 쓰다듬기 — 기분 상승 + 짧은 반응 |
| `bbuddy_observe` | 명시적 작업 반응 카드 + XP (ambient 반응은 `<!-- bbuddy: -->` 코멘트 사용) |
| `bbuddy_evolve` | 외형만 변경 (성격·스탯·XP 유지) |
| `bbuddy_remember` | 장기 메모리 저장 |
| `bbuddy_dream` | 메모리 통합 → 성격 드리프트 |
| `bbuddy_mute` / `bbuddy_unmute` | Observer 음소거 토글 |
| `bbuddy_respawn` | 현재 컴패니언 영구 릴리즈 |
| `bbuddy_save` | 현재 컴패니언을 슬롯에 스냅샷 |
| `bbuddy_list` | 저장된 슬롯 목록 |
| `bbuddy_summon` | 슬롯에서 소환 (현재는 `__previous`로 자동 백업) |
| `bbuddy_dismiss` | 저장된 슬롯 영구 삭제 |
| `bbuddy_language` | UI 언어 전환 (`en` / `ko`) |

### 반응 파이프라인 — 코멘트 방식 권장

`bbuddy_observe`는 명시적 호출용. Ambient 코딩 반응은 Claude 응답
끝에 `<!-- bbuddy: {15자 이내} -->` 코멘트 붙이는 방식 — Stop hook이
이걸 수집해 statusline 말풍선으로 표시한다. 코멘트 경로 ~15 토큰,
`bbuddy_observe` ~200 토큰. 설치 스크립트가 이 규약을 각 CLI 시스템
프롬프트에 주입한다.

---

## Wizard 플로우

`bbuddy_create` / `bbuddy_evolve`는 **stateless**. 넘기는 파라미터만
보고 다음 단계를 프레임 카드로 렌더 후 반환. 파라미터를 누적하면서
다시 호출하면 되고, `confirm: true`를 넣으면 최종 저장.

```
name
  └─▶ appearance_mode
        ├─ "1" ─▶ species ──────────────────────┐
        ├─ "2" ─▶ parts (face/eye/accessory/body)┤
        ├─ "3" ─▶ ai_prompt ────────────────────┤
        └─ "4" ─▶ manual_frame1/2/3 ────────────┘
                                                 │
                                        personality_preset
                                                 │
                                              stats
                                                 │
                                          confirm: true
                                                 │
                                          저장 완료 ✅
```

### 파라미터 시그니처

```typescript
bbuddy_create({
  name: string,
  appearance_mode: "1" | "2" | "3" | "4",

  // 모드 1
  species?: string,                         // 21종 중 하나

  // 모드 2
  parts?: {
    face: "round" | "square" | "pointy" | "blob",
    eye: string,                            // "·" "o" "♥" 등 아무 문자
    accessory: "hat"|"crown"|"horns"|"ears"|"halo"|"antenna"|"bow"|"none",
    body: "arms"|"tiny"|"legs"|"tail"|"float"|"none",
  },

  // 모드 3 — 호스트 LLM이 ASCII 그림
  ai_prompt?: string,                       // "선글라스 쓴 고양이"

  // 모드 4 — 직접 입력, \n으로 줄 구분, 최대 6줄 × 14자
  manual_frame1?: string,
  manual_frame2?: string,
  manual_frame3?: string,

  // 공통
  personality_preset?: "tsundere"|"passionate"|"cold"|"prankster"|"sage"|"custom",
  custom_prompt?: string,                   // preset === "custom"일 때 필수
  stats?: {
    DEBUGGING: number,   // 합계 100, 각 1–80
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

| 파일 | 이벤트 | 역할 |
|---|---|---|
| `hooks/session-start.mjs` | SessionStart | status 파일 읽어 컴패니언 컨텍스트를 Claude 시스템 프롬프트에 주입. 없으면 `/bbuddy:create` 안내. |
| `hooks/stop.mjs` | Stop | transcript에서 `<!-- bbuddy: ... -->` 수집 → status 파일에 reaction 저장. |
| `hooks/pre-tool-use.mjs` | PreToolUse(Bash) | `working` 인디케이터 (⚙) 설정. |
| `hooks/post-tool-use.mjs` | PostToolUse(Bash) | exit code → 성공 `excited` (★), 실패 `concerned` (>.<). |
| `hooks/codex-session-start.mjs` | Codex CLI | session-start와 동일, 영문 컨텍스트. |
| `hooks/codex-stop.mjs` | Codex CLI | stdout으로 ANSI 스프라이트 렌더 (Codex엔 statusline API 없음). |

### Reaction 스키마

`~/.claude/bbuddy-status.json`에 기록됨:

```typescript
{
  reaction: "excited" | "concerned" | "working" | "chime",
  reaction_expires: number,      // ms timestamp
  reaction_eye: string,          // 예: "★" 또는 ">.<"
  reaction_indicator: string,    // 이름 옆 표시
  reaction_text: string,         // 말풍선 텍스트
}
```

---

## Skills

Claude Code에서 `/bbuddy:<name>` 으로 호출. 각 `SKILL.md`는 Claude
에게 어떤 MCP 도구를 어떻게 호출해 응답을 어떻게 전달할지 짧게
지시하는 파일이다.

```
/bbuddy:create    컴패니언 생성 wizard
/bbuddy:show      상태 카드
/bbuddy:pet       쓰다듬기
/bbuddy:stats     스탯 상세
/bbuddy:rename    이름 변경 (snapshot → respawn → recreate)
/bbuddy:evolve    외형 변경
/bbuddy:save      슬롯에 저장
/bbuddy:list      저장된 슬롯 목록
/bbuddy:summon    슬롯에서 소환
/bbuddy:dismiss   슬롯 삭제
/bbuddy:language  UI 언어 전환 (en|ko)
/bbuddy:hatch     랜덤 컴패니언
/bbuddy:observe   명시적 반응 카드 (opt-in)
/bbuddy:remember  메모리 저장
/bbuddy:dream     메모리 통합
/bbuddy:respawn   현재 컴패니언 삭제 (destructive)
/bbuddy:off       observer 음소거
/bbuddy:on        음소거 해제
```

---

## 파일 구조

```
bbuddy/
├── src/
│   ├── server/index.ts           # MCP 서버 — 16 도구 + 리소스
│   ├── creator/
│   │   ├── wizard.ts             # state machine + 공유 .___. 카드 셸
│   │   ├── parts-combiner.ts     # 모드 2 (face/eye/accessory/body)
│   │   ├── manual-input.ts       # 모드 4 (직접 입력)
│   │   ├── presets.ts            # 성격 프리셋 6종 + bio 템플릿
│   │   ├── stats.ts              # 100pt 분배 검증
│   │   └── sprites/parts.json
│   ├── db/schema.ts              # SQLite 스키마 + 레거시 경로 마이그
│   ├── i18n/                     # 영어 (기본) + 한국어 카탈로그
│   ├── lib/                      # types, species, observer, leveling…
│   ├── statusline-wrapper.ts     # ~1s statusline 렌더러
│   └── __tests__/                # vitest (315)
├── hooks/*.mjs                   # Claude Code + Codex hooks
├── skills/*/SKILL.md             # 18 slash commands
├── .claude-plugin/               # Claude Code 플러그인 매니페스트 + .mcp.json
├── .codex-plugin/                # Codex 플러그인 매니페스트 + .mcp.json
├── install.sh · install.ps1      # 원클릭 설치 스크립트
└── package.json
```

---

## 테스트

```bash
npm test                # vitest 315개
npm run test:coverage   # coverage/ 에 리포트 생성
npm run build           # TypeScript → dist/
```

커버리지 35% (라인). 핵심 creator, species, lib 경로는 잘 커버되어
있고 `src/server/index.ts` (MCP 도구 핸들러)는 integration surface라
Claude Code에서 수동 검증 위주.

AI 외형 생성(모드 3)은 호스트 LLM(Claude Code / Codex)에 위임하므로
**별도 API 키가 필요 없다**.

---

## Credits

- **Upstream**:
  [**fiorastudio/buddy**](https://github.com/fiorastudio/buddy) —
  원본 MCP 컴패니언 프로젝트. 21종 스프라이트, MCP 서버 골격,
  statusline 렌더러, XP/dream/evolution 시스템. bbuddy는 fork이며
  rewrite가 아니다; 기본 hatching/status/presence 로직은 그대로. MIT 호환.
- **Speech-bubble 디자인**:
  [**gokomong/claude-buddy**](https://github.com/gokomong/claude-buddy)
  — "Keep Your Claude Code Buddy Forever" 프로젝트. bbuddy statusline
  (`src/statusline-wrapper.ts`) 에 쓰이는 ASCII 말풍선 박스의 원형.
  커밋 `26f01f6` 에서 포팅.

### bbuddy가 추가한 것

- **Creator 시스템** — 4-모드 wizard (종족 / 파츠 / AI 위임 / 직접
  입력), 성격 프리셋 6종, 100pt 스탯 분배, `custom_sprites` 테이블.
- **Slots** — `bbuddy_save / list / summon / dismiss`, 스왑 시
  `__previous` 자동 백업.
- **i18n** — 영어 기본 + `bbuddy_language`로 한국어 opt-in.
- **Tool-driven 생성 wizard** — MCP 도구가 프레임 `.______.` 카드를
  직접 렌더; 스킬 MD는 verbatim 릴레이만. LLM 대화 스크립팅 없음.
- **Statusline 경도화** — 반응 상태별 anchor 안정, 터미널 너비
  자동 감지 (tmux · WezTerm · kitty · `stty`), CJK visual-width 수학,
  HUD 플러그인 의존성 0.
- **Codex CLI 확장** — stdout으로 ANSI 스프라이트 렌더하는 Codex
  전용 훅 (Codex엔 statusline API가 없음).
- **패키징** — `${CLAUDE_PLUGIN_ROOT}` / `${CODEX_PLUGIN_ROOT}` 를
  사용한 마켓플레이스 ready `.mcp.json` 매니페스트; `~/.bbddy/`,
  `~/.buddy/` 에서 레거시 DB 자동 마이그레이션.

---

## 라이선스

MIT — [LICENSE](./LICENSE) 참고.
