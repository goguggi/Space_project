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

## 축척 (D-39)

- 화면 단위 1 = 실제 10 m (`SCENE_METERS_PER_UNIT`). 로켓 높이 약 70 m → 화면 7 단위.
- 지구는 실제 반지름(6,371 km) 대신 화면 6,000 단위(`EARTH_DISPLAY_RADIUS`)의 구로 그린다. 지구 중심을 y = −6,000에 두어 발사대 바닥(지표면)이 y = 0이다.
- 물리 계산(11단계~)은 실제 m 값으로 하고, 화면에 놓을 때만 이 축척으로 바꾼다.

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `launchScene.js` | `createLaunchScene(container)`, `SCENE_METERS_PER_UNIT`, `EARTH_DISPLAY_RADIUS` | 렌더러, 장면, 카메라, 지구(구)와 옅은 대기, 발사대(받침과 탑), 태양광·반구광, 별 배경, OrbitControls(10단계 임시 카메라). 반환값: `start()`, `stop()`, `onFrame(fn)`(매 프레임 dt초를 넘겨 호출), `scene`, `camera`, `surfaceY` 등 |

- `main.js`는 이 모듈을 동적 `import()`로 불러온다. 3D를 지원하지 않는 환경에서도 계산기 부분은 동작하게 하기 위함이다.
