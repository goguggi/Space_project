# src/styles/ — CSS

화면 스타일 파일을 둔다. 외부 CSS 프레임워크는 쓰지 않는다.

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `main.css` | 전체 배치, 글꼴, 색상, 선택 메뉴와 슬라이더 기본 스타일 | 1단계 |
| `chart.css` | 막대 그래프와 생존 아이콘 스타일 (HTML/CSS 방식으로 그릴 경우) | 7단계 |

## 현재 파일 목록

| 파일 | 설명 |
|---|---|
| `main.css` | 어두운 배경의 기본 배치. 색상은 `:root` 변수로 정의. `.panel`(구역), `.field-label`/`.field-select`(입력), `.info-list`(정보 목록), `.field-range`/`.range-scale`/`.readout`(슬라이더, 3단계), `.button-group`/`.preset-button`(프리셋, 3단계) |
