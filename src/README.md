# src/ — 소스 코드 구성

프로그램의 모든 JavaScript와 CSS 파일이 들어 있다.
각 하위 폴더에는 그 폴더의 파일을 설명하는 README.md가 하나씩 있다.

## 폴더 역할

| 폴더 | 역할 | 알아야 하는 것 | 몰라야 하는 것 |
|---|---|---|---|
| [data/](data/README.md) | 상수와 기초 데이터 | 없음 | 계산, 화면 |
| [physics/](physics/README.md) | 계산 로직 (순수 함수) | data | 화면(DOM) |
| [utils/](utils/README.md) | 단위 변환, 숫자 서식 | data | 화면(DOM) |
| [ui/](ui/README.md) | 화면 구성 요소 | data, physics, utils | 없음 |
| [styles/](styles/README.md) | CSS | 없음 | 없음 |

## 의존 방향

```
ui  →  physics  →  data
ui  →  utils    →  data
ui  →  styles
```

화살표 반대 방향의 의존은 금지한다. 예를 들어 `physics/`의 파일이 `ui/`의 파일을 불러오면 안 된다.

## 현재 파일 목록

아직 소스 파일이 없다. 1단계([docs/04_roadmap.md](../docs/04_roadmap.md))부터 파일이 추가되며,
추가될 때마다 해당 폴더의 README.md에 기록한다.
