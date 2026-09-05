# src/data/ — 상수와 기초 데이터

계산과 화면에서 쓰는 모든 수치를 이 폴더에만 둔다.
값의 근거는 [docs/05_data_reference.md](../../docs/05_data_reference.md)에 있으며, 코드의 값은 그 문서와 항상 일치해야 한다.

## 규칙

- 각 값 옆에 출처를 주석으로 남긴다.
- 단위는 SI 기본 단위(m, s, m/s)로 저장한다. 표시용 단위 변환은 `utils/`가 맡는다.
- 이 폴더의 파일은 다른 폴더의 파일을 불러오지 않는다.

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `launchSites.js` | 발사장 5곳: 이름, 국가, 위도, 경도 | 1단계 |
| `constants.js` | 광속, AU, 광년, 1년(초), 표준 중력가속도 | 2단계 |
| `destinations.js` | 천체 12개: 이름, 구분, 지구로부터의 평균 거리(m), 출처 | 2단계 |
| `rockets.js` | 속도 슬라이더 하한(팔콘 헤비 11.2 km/s), 상한(0.99c), 프리셋 6개 | 3단계 |
| `organisms.js` | 생물 5종: 이름, 대표 수명(s), 출처 | 7단계 |
| `falconHeavy.js` | 팔콘 헤비 각 단의 건조 질량, 추진제 질량, 추력, 비추력. 형식은 로켓 제원 JSON의 `stages[]`와 동일 | 11단계 |
| `landingSites.js` | 발사장별 부스터 착륙장과 코어 무인선 위치 | 13단계 |
| `rocketSpecSchema.js` | 로켓 제원 JSON 형식의 필수 필드 정의 | 16단계 |

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `launchSites.js` | `LAUNCH_SITES`, `DEFAULT_LAUNCH_SITE_ID`, `findLaunchSite(id)` | 발사장 5곳 (id, 이름, 국가, 위도, 경도, 비고). 기본 선택은 나로우주센터 |
| `constants.js` | `SPEED_OF_LIGHT`, `ASTRONOMICAL_UNIT`, `LIGHT_YEAR`, `SECONDS_PER_YEAR`, `STANDARD_GRAVITY`, `EARTH_GM`, `EARTH_RADIUS` | 물리 상수. 프로젝트에서 유일한 정의 위치 |
| `destinations.js` | `DESTINATIONS`, `DESTINATION_CATEGORIES`, `DEFAULT_DESTINATION_ID`, `findDestination(id)` | 천체 12개 (id, 구분, 이름, 거리 m, 출처). 원 자료 단위(km, AU, 광년)를 `constants.js`로 m 변환. 기본 선택은 달 |

- `destinations.js`는 같은 폴더의 `constants.js`만 불러온다. (`utils/`를 쓰지 않는 이유: 이 폴더는 다른 폴더를 모른다는 규칙)
