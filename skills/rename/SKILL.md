---
name: rename
description: Rename your bbddy companion
---

# /bbddy:rename — 컴패니언 이름 변경

사용자가 `/bbddy:rename` 을 입력하면 이 스킬을 실행한다.

## 역할

사용자에게 새 이름을 묻고, `bbddy_create` 를 통해 이름을 변경한다.

## 흐름

1. 현재 이름을 확인하기 위해 `bbddy_status({})` 를 먼저 호출한다.
2. 사용자에게 새 이름을 묻는다: `"새로운 이름을 입력하세요:"`
3. `bbddy_hatch({ name: "<새이름>", confirm: true })` 를 호출해서 이름을 업데이트한다.

## 주의

이름 변경은 외형/성격/스탯에 영향을 주지 않는다.
변경 후 `bbddy_status({})` 를 호출해서 업데이트된 카드를 보여준다.
