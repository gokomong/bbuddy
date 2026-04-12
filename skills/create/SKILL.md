---
name: create
description: Create your own bbddy companion — name, appearance, personality, stats
---

# /bbddy:create — 컴패니언 생성 wizard

사용자가 `/bbddy:create` 를 입력하면 이 스킬을 실행한다.

## 역할

`bbddy_create` MCP 도구를 단계별로 호출해서 사용자가 자신만의 컴패니언을 만들도록 안내한다.

## 흐름

1. **이름** — 사용자에게 컴패니언 이름을 묻는다.
2. **외형 모드** — 4가지 선택지를 보여준다:
   - `1` 기본 종족 (21종 중 선택)
   - `2` 파츠 조합 (얼굴/눈/악세/몸통)
   - `3` AI 생성 (프롬프트 입력)
   - `4` 직접 타이핑 (ASCII 아트 입력)
3. **성격** — 프리셋 6종(츤데레/열정적/냉정한/장난꾸러기/현자/커스텀) 중 선택.
4. **스탯** — 100pt를 5개 스탯(DEBUGGING/PATIENCE/CHAOS/WISDOM/SNARK)에 분배.
5. **확인** — 프리뷰 카드를 보여주고 `confirm: true` 로 최종 저장.

## 도구 사용법

각 단계에서 `bbddy_create` 를 호출한다. 응답에 다음 단계 안내 텍스트가 포함되어 있으면 사용자에게 그대로 표시하고 입력을 기다린다.

```
// 예시 — 이름만 있을 때
bbddy_create({ name: "Mochi" })
→ 응답: appearance_mode 선택 안내

// 예시 — 외형 모드까지 선택
bbddy_create({ name: "Mochi", appearance_mode: "3", ai_prompt: "선글라스 고양이" })
→ 응답: 성격 선택 안내

// 예시 — 전체 파라미터 + 확인
bbddy_create({
  name: "Mochi",
  appearance_mode: "1",
  species: "Void Cat",
  personality_preset: "tsundere",
  stats: { DEBUGGING: 40, PATIENCE: 25, CHAOS: 10, WISDOM: 15, SNARK: 10 },
  confirm: true
})
→ 응답: 생성 완료 + 컴패니언 카드
```

## 주의

- 각 단계는 순서대로 진행한다. 사용자가 이미 입력한 값은 다음 호출에 그대로 전달한다.
- 모드 3(AI 생성)은 서버가 너에게 ASCII 프레임 제약과 다음 호출 템플릿을 돌려준다. 그 템플릿대로 프레임 3개를 직접 그려서 `appearance_mode: "4"` + `manual_frame1/2/3` 로 `bbddy_create`를 다시 호출하면 된다. 별도 API 키는 필요 없다.
- 생성 완료 후 `bbddy_status` 를 호출해서 카드를 한 번 더 보여준다.
