---
name: dismiss
description: Permanently delete a saved bbuddy slot
---

# /bbuddy:dismiss — 저장된 슬롯 삭제

사용자가 `/bbuddy:dismiss <slot>` 을 입력하면 이 스킬을 실행한다.

## 역할

저장된 슬롯을 영구히 삭제한다. 현재 활성 컴패니언에는 영향을 주지 않는다. 슬롯 안의 스냅샷만 사라진다. 한번 지운 슬롯은 복구되지 않으므로 사용자에게 의도가 맞는지 한 번 확인을 권장한다.

## 실행

```
bbuddy_dismiss({ slot: "<사용자가-지정한-이름>" })
```

존재하지 않는 슬롯이면 그렇게 안내한다. 인자가 없으면 어떤 슬롯을 지울지 물어본다.
