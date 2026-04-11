---
name: evolve
description: Change your bbddy companion's appearance
---

# /bbddy:evolve — 컴패니언 외형 변경

사용자가 `/bbddy:evolve` 를 입력하면 이 스킬을 실행한다.

## 역할

`bbddy_evolve` MCP 도구를 단계별로 호출해서 기존 컴패니언의 외형을 바꾼다.
이름·성격·스탯은 유지되고 스프라이트(ASCII 아트)만 교체된다.

## 흐름

1. 현재 상태를 확인하기 위해 `bbddy_status({})` 를 호출한다.
2. 외형 모드를 안내한다:
   - `2` 파츠 조합 (얼굴/눈/악세/몸통 재조합)
   - `3` AI 생성 (새 프롬프트로 재생성)
   - `4` 직접 타이핑 (새 ASCII 아트 입력)
3. 선택에 따라 필요한 파라미터를 모은다.
4. `bbddy_evolve({ appearance_mode: "...", ..., confirm: true })` 로 저장한다.

## 도구 사용법

```
// 파츠 조합으로 변경
bbddy_evolve({
  appearance_mode: "2",
  parts: { face: "square", eye: "♥", accessory: "crown", body: "arms" },
  confirm: true
})

// AI로 재생성
bbddy_evolve({
  appearance_mode: "3",
  ai_prompt: "로봇 마법사",
  confirm: true
})
```

완료 후 `bbddy_status({})` 로 새 카드를 보여준다.
