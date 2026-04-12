---
name: list
description: List all saved bbuddy slots
---

# /bbuddy:list — 저장된 컴패니언 목록

사용자가 `/bbuddy:list` 를 입력하면 이 스킬을 실행한다.

## 역할

`bbuddy_save` 로 저장된 모든 슬롯을 나열한다. 각 슬롯의 이름, 컴패니언 이름, 종족, 레벨, 저장 시각을 보여준다. `__previous` 슬롯은 `bbuddy_summon` 직전 자동 백업본이라는 점을 명시한다.

## 실행

```
bbuddy_list({})
```

응답을 그대로 표시한다. 슬롯이 비어 있으면 `bbuddy_save` 안내를 함께 보여준다.
