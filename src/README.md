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
| [launch/](launch/README.md) | 3D 발사 장면 (Three.js) | data, physics, utils, lib/three | 없음 |
| [styles/](styles/README.md) | CSS | 없음 | 없음 |

## 의존 방향

```
ui  →  physics  →  data
ui  →  utils    →  data
ui  →  styles
launch  →  physics  →  data
launch  →  lib/three
ui  →  launch   (발사 버튼이 장면을 시작시킴)
```

Three.js는 `launch/` 안의 파일에서만 불러온다.

화살표 반대 방향의 의존은 금지한다. 예를 들어 `physics/`의 파일이 `ui/`의 파일을 불러오면 안 된다.

## 진입점

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `main.js` | 프로그램 진입점. 각 화면 구성 요소를 만들고 `state` 객체로 사용자 선택을 모아 둔다. 계산이나 그리기는 하지 않는다 | 1단계 |

`index.html`(저장소 최상위)이 `<script type="module" src="src/main.js">`로 이 파일을 불러온다.

## 구성 요소 사이의 값 전달 방식 (1단계에서 정함)

- 각 UI 구성 요소는 `create○○(container, onChange)` 형태의 함수로 만든다.
- 선택이 바뀌면 `onChange`로 값을 알리고, `main.js`가 그 값을 `state`에 저장한다.
- 입력이 바뀔 때마다 `main.js`의 `recompute()`가 `physics/timeDilation.js`를 호출해 `state.result`(초 단위)를 갱신한다. (4단계)
- 결과를 그리는 구성 요소(5~7단계)는 `recompute()` 안에서 `state.result`를 받아 갱신한다.
- 개발 중에는 브라우저 콘솔에서 `window.__state`로 현재 상태를 볼 수 있다.

## 현재 파일 목록

- `main.js` (1단계. 2단계 목적지, 3단계 속도·프리셋·로런츠, 4단계 편도/왕복과 `recompute()`, 5단계 결과 표 연결 추가)
- 나머지는 각 하위 폴더의 README.md 참고
