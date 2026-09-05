# src/launch/ — 3D 발사 장면

KSP처럼 3인칭 시점에서 로켓 발사, 단 분리, 재착륙을 보여주는 3D 장면 코드를 둔다.
계획은 [docs/07_feature_plans.md](../../docs/07_feature_plans.md) 기능 1, 물리는 [docs/03_physics.md](../../docs/03_physics.md) 6절에 있다.

## 규칙

- Three.js는 **이 폴더의 파일에서만** 불러온다. (`lib/three/`)
- 물리 계산은 하지 않는다. `physics/launchDynamics.js` 등이 계산한 위치와 속도를 받아 그리기만 한다.
- 로켓 제원, 착륙장 위치 같은 숫자는 `data/`에서 가져온다.
- 화면 문자열은 한국어로 쓴다.

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `launchScene.js` | 장면 생성: 지구(구), 하늘 배경, 발사대, 조명, 렌더러 | 10단계 |
| `rocketModel.js` | 부스터 2기, 코어, 2단의 3D 형상과 화염 | 11단계, 12단계 |
| `followCamera.js` | 대상 뒤를 따라가는 3인칭 카메라 | 11단계 |
| `launchTimeline.js` | 발사 → 분리 → 착륙 → 종료의 진행 상태, 배속(1~10배) | 11단계 |
| `pipView.js` | 착륙 장면용 보조 화면 | 14단계 |
| `launchHud.js` | 경과 시간, 고도, 속도, 단계, 배속 조절, 건너뛰기 | 14단계 |

## 현재 파일 목록

아직 없음.
