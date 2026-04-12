---
name: summon
description: Summon a saved bbuddy companion from a slot, replacing the current one
---

# /bbuddy:summon — 저장된 컴패니언 소환

사용자가 `/bbuddy:summon <slot>` 을 입력하면 이 스킬을 실행한다.

## 역할

지정된 슬롯에서 컴패니언을 불러와 현재 활성 컴패니언을 교체한다. 교체하기 전에 현재 컴패니언을 자동으로 `__previous` 슬롯에 백업한다 — 그래서 한 번의 실수가 영구 손실이 아니다. `bbuddy_summon { slot: "__previous" }` 로 즉시 되돌릴 수 있다.

## 실행

```
bbuddy_summon({ slot: "<사용자가-지정한-이름>" })
```

슬롯이 없으면 `bbuddy_list` 를 안내한다. 인자가 없으면 사용자에게 어떤 슬롯을 부를지 물어본다.

## 주의

- 이전 컴패니언의 XP, memories, evolution_history 같은 부수 데이터는 DB에 그대로 남는다(슬롯에 백업된 companion id를 그대로 복원하므로 재소환 시 다시 연결됨).
- 진짜 영구 삭제는 `bbuddy_dismiss` 또는 `bbuddy_respawn` 으로만 가능하다.
