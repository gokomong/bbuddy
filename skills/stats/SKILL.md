---
name: stats
description: Show your bbddy companion's stat breakdown
---

# /bbddy:stats — 스탯 카드 표시

사용자가 `/bbddy:stats` 를 입력하면 이 스킬을 실행한다.

## 역할

`bbddy_status` MCP 도구를 호출해서 스탯 정보를 집중적으로 보여준다.

## 실행

```
bbddy_status({})
```

결과에서 스탯 바(DEBUGGING / PATIENCE / CHAOS / WISDOM / SNARK)와 레벨/XP 정보를 강조해서 표시한다.

현재 피크 스탯(가장 높은 값)과 덤프 스탯(가장 낮은 값)도 함께 언급한다.
