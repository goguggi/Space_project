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
- 지구도 같은 비율(반지름 637,100 단위, `EARTH_DISPLAY_RADIUS`)로 그린다. 지구 중심을 y = −637,100에 두어 발사대 바닥(지표면)이 y = 0이다.
  그래서 물리 좌표(지구 중심 원점, 발사장 (0, R))를 `(x / 10, (y − R) / 10, 0)`으로 나누기만 하면 화면 좌표가 된다.
- 가까운 로켓(수 단위)과 먼 지구(수십만 단위)를 함께 그리기 위해 렌더러에 로그 깊이 버퍼를 켠다.
- 물리 계산(11단계~)은 실제 m 값으로 하고, 화면에 놓을 때만 이 축척으로 바꾼다.

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `launchScene.js` | `createLaunchScene(container)`, `SCENE_METERS_PER_UNIT`, `EARTH_DISPLAY_RADIUS` | 렌더러(로그 깊이), 장면, 카메라, 지구(구)와 옅은 대기, 발사대(받침과 탑), 태양광·반구광, 별 배경, OrbitControls. 반환값: `start()`, `stop()`, `onFrame(fn)`(매 프레임 dt초), `scene`, `camera`, `controls`, `surfaceY`. 탭이 숨겨지면 setTimeout으로 시뮬레이션만 계속 돌린다 (10단계) |
| `rocketModel.js` | `createRocketModel(spec)` | 제원의 `geometry.parts[]`로 단별 그룹(`stageGroups`)과 화염(`flames`)을 만든다. `update(sim)`이 연소 중인 단의 화염만 보이게 하고 흔들림을 준다 (11단계). `detachStage(id, scene)`은 단을 세계 좌표 그대로 장면의 독립 그룹으로 떼어내고, `reassemble()`은 다시 붙인다 (12단계) |
| `followCamera.js` | `createFollowCamera(camera, controls)` | 대상이 움직인 만큼 카메라를 같이 옮기고 OrbitControls 중심을 대상에 둔다. 사용자가 돌린 시점 각도가 유지된다. `setTarget(obj, offset)`, `update()` (11단계) |
| `launchTimeline.js` | `createLaunchTimeline(spec)`, `TIME_SCALES` | 시뮬레이션 시계와 배속(1·2·5·10배), 사건 기록, 단계 이름. `start()`, `pause()`, `reset()`, `skip()`(남은 과정 즉시 계산), `update(dtReal)` (11단계) |
| `launchHud.js` | `createLaunchHud(container, {onTimeScale, onSkip})` | T+ 시계, 단계 이름, 고도·속도·질량, 배속 버튼, 건너뛰기. `update(timeline)` (11단계 기본형, 14단계 확장) |
| `launchController.js` | `createLaunchController(sceneContainer, hudContainer, spec, {onComplete})` | 위 모듈을 조립. 매 프레임 시뮬레이션 전진 → 물리 좌표를 화면 좌표로 변환해 로켓 배치(추력 방향으로 회전) → 카메라·HUD 갱신. `launch()`, `reset()`, `timeline` (11단계). 분리 사건이 오면 단을 떼어내 `detachedGroups`에 넣고 매 프레임 각 물체의 위치(속도 방향으로 회전)에 놓는다 (12단계) |

- `main.js`는 `launchController.js`를 동적 `import()`로 불러온다. 3D를 지원하지 않는 환경에서도 계산기 부분은 동작하게 하기 위함이다.
