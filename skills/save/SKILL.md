---
name: save
description: Save the current bbddy companion to a named slot for later swap
---

# /bbddy:save — 현재 컴패니언 저장

사용자가 `/bbddy:save <slot>` 을 입력하면 이 스킬을 실행한다.

## 역할

현재 활성 bbddy 컴패니언을 명명된 슬롯에 스냅샷으로 저장한다. 같은 슬롯 이름에 다시 저장하면 덮어쓴다. `bbddy_summon` 으로 나중에 불러올 수 있다.

## 실행

```
bbddy_save({ slot: "<사용자가-준-이름>" })
```

슬롯 이름은 1–24자 사이여야 한다. `__` 로 시작하는 이름은 내부 예약이라 거부된다.

저장 후 응답 텍스트를 그대로 보여준다. 인자가 없으면 사용자에게 슬롯 이름을 물어본다.
