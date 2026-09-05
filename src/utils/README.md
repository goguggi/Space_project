# src/utils/ — 공통 도우미

단위 변환과 숫자 서식처럼 여러 곳에서 함께 쓰는 작은 함수를 둔다.

## 규칙

- 화면(DOM)을 다루지 않는다.
- 상수는 `data/constants.js`에서 가져온다. 이 폴더에 숫자를 직접 쓰지 않는다.

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `units.js` | km / AU / 광년 ↔ m 변환, km/s ↔ m/s, 광속 비율 ↔ m/s | 2단계 |
| `formatTime.js` | 초 → 년/일/시/분/초 분해, 큰 수(백만 년 이상) 단위 축약, 천 단위 구분 | 5단계 |

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `formatCoordinate.js` | `formatLatitude(deg)`, `formatLongitude(deg)` | 도 단위 실수를 "34.43° N", "80.60° W" 형태로 서식 (1단계) |
| `units.js` | `kmToMeters`, `metersToKm`, `auToMeters`, `metersToAu`, `lightYearsToMeters`, `metersToLightYears`, `kmPerSecToMetersPerSec`, `metersPerSecToKmPerSec`, `fractionOfCToMetersPerSec`, `metersPerSecToFractionOfC`, `formatDistance(m)`, `formatNumber(v, digits)` | 거리·속도 단위 변환과 거리 자동 단위 서식. 0.01 AU 미만 km, 0.1 광년 미만 AU, 그 이상 광년, 1만 광년 이상 "만 광년" (2단계) |
| `formatTime.js` | `splitDuration(s)`, `formatYears(y)`, `formatSubSecond(s)`, `formatDuration(s)`, `formatDurationApprox(s)` | 초 → 년/일/시/분/초 분해와 문자열. 100만 년 이상은 "만 년/억 년/조 년", 1초 미만은 밀리초/마이크로초/나노초. `formatDurationApprox`는 "≈ 4.29년"처럼 한 단위 요약 (5단계) |
