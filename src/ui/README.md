# src/ui/ — 화면 구성 요소

사용자 입력을 받고 계산 결과를 화면에 그리는 파일을 둔다.
한 파일은 화면의 한 구성 요소만 담당한다.

## 규칙

- 계산은 직접 하지 않고 `physics/`의 함수를 호출한다.
- 숫자 서식과 단위 변환은 `utils/`의 함수를 호출한다.
- 화면 문자열은 모두 한국어로 쓴다.
- 구성 요소는 `create○○(container, onChange)` 함수로 만들고, 값이 바뀌면 `onChange`로 알린다. (자세한 내용은 [../README.md](../README.md))

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `launchSiteSelector.js` | 발사장 선택 메뉴, 선택한 발사장 정보 표시 | 1단계 |
| `destinationSelector.js` | 구분별 천체 선택 메뉴, 거리 표시 | 2단계 |
| `speedSlider.js` | 로그 눈금 속도 슬라이더 (11.2 km/s ~ 0.99c), 속도 표시 | 3단계 |
| `speedPresets.js` | 프리셋 버튼 6개 (보이저 1호, 파커, 0.1c, 0.5c, 0.9c, 0.99c) | 3단계 |
| `lorentzDisplay.js` | 로런츠 인자 표시 전용 슬라이더 | 3단계 |
| `tripTypeSelector.js` | 편도 / 왕복 선택 | 4단계 |
| `resultTable.js` | 지구 시간 / 우주선 시간 / 차이 수치 표 | 5단계 |
| `stopwatch.js` | 0에서 결과값까지 올라가는 스톱워치 애니메이션 (자동 시작, 3~15초, 년/일/시/분/초) | 6단계 |
| `departureAgeInput.js` | 생물별 출발 시점 나이 입력란 (기본값 0) | 7단계 |
| `lifespanChart.js` | 생물별 수명 대비 경과 시간 막대 그래프 (HTML/CSS div, 로그 눈금) | 7단계 |
| `survivalIcons.js` | 생물별 도착 시점 생존/사망 아이콘 | 7단계 |
| `motionModelSelector.js` | 등속 / 가속-감속(1g 고정) 모델 선택 | 8단계 |
| `launchButton.js` | "발사" 버튼, 발사 장면 시작과 결과 화면 전환 | 11단계, 15단계 |
| `rocketFileLoader.js` | "설계한 로켓 불러오기" 버튼, 파일 선택, 오류 안내 | 16단계 |

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `launchSiteSelector.js` | `createLaunchSiteSelector(container, onChange)` | 발사장 `<select>`와 정보 목록(이름, 국가, 위도, 경도, 비고). 반환값의 `getSelected()`로 현재 선택을 읽는다 |
| `destinationSelector.js` | `createDestinationSelector(container, onChange)` | 구분별 `<optgroup>`으로 묶은 천체 `<select>`와 정보 목록(이름, 구분, 평균 거리, km 환산, 근거) |
