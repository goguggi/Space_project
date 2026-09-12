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
| `launchHud.js` | 경과 시간, 고도, 속도, 단계, 배속 조절, 건너뛰기 | 11단계, 14단계 |
| `landingTarget.js` | 보조 화면이 비출 착륙 대상 고르기 | 14단계 |

## 축척 (D-39)

- 화면 단위 1 = 실제 10 m (`SCENE_METERS_PER_UNIT`). 로켓 높이 약 70 m → 화면 7 단위.
- 지구도 같은 비율(반지름 637,100 단위, `EARTH_DISPLAY_RADIUS`)로 그린다. 지구 중심을 y = −637,100에 두어 발사대 바닥(지표면)이 y = 0이다.
  그래서 물리 좌표(지구 중심 원점, 발사장 (0, R))를 `(x / 10, (y − R) / 10, 0)`으로 나누기만 하면 화면 좌표가 된다.
- 가까운 로켓(수 단위)과 먼 지구(수십만 단위)를 함께 그리기 위해 렌더러에 로그 깊이 버퍼를 켠다.
- 물리 계산(11단계~)은 실제 m 값으로 하고, 화면에 놓을 때만 이 축척으로 바꾼다.

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `launchScene.js` | `createLaunchScene(container)`, `SCENE_METERS_PER_UNIT`, `EARTH_DISPLAY_RADIUS` | 렌더러(로그 깊이), 장면, 카메라, 지구(구)와 옅은 대기, 발사대(받침과 탑), 태양광·반구광, 별 배경, OrbitControls. 반환값: `start()`, `stop()`, `onFrame(fn)`(매 프레임 dt초), `onAfterRender(fn)`(주 화면을 그린 직후, 14단계), `scene`, `camera`, `controls`, `surfaceY`. 탭이 숨겨지면 setTimeout으로 시뮬레이션만 계속 돌린다 (10단계) |
| `rocketModel.js` | `createRocketModel(spec)` | 제원의 `geometry.parts[]`로 단별 그룹(`stageGroups`)과 화염(`flames`)을 만든다. `update(sim)`이 연소 중인 단의 화염만 보이게 하고 흔들림을 준다 (11단계). `detachStage(id, scene)`은 단을 세계 좌표 그대로 장면의 독립 그룹으로 떼어내고, `reassemble()`은 다시 붙인다 (12단계) |
| `followCamera.js` | `createFollowCamera(camera, controls)` | 대상이 움직인 만큼 카메라를 같이 옮기고 OrbitControls 중심을 대상에 둔다. 사용자가 돌린 시점 각도가 유지된다. `setTarget(obj, offset)`, `update()` (11단계) |
| `launchTimeline.js` | `createLaunchTimeline(spec)`, `TIME_SCALES` | 시뮬레이션 시계와 배속(1·2·5·10배), 사건 기록, 단계 이름. `start()`, `pause()`, `reset()`, `skip()`(남은 과정 즉시 계산), `update(dtReal)` (11단계) |
| `launchHud.js` | `createLaunchHud(container, {onTimeScale, onSkip})` | 위쪽: T+ 시계, 단계 이름, 고도·속도·질량, 배속 버튼, 건너뛰기 (11단계). 아래쪽: 팔콘 헤비 중계 화면 같은 두 칸 텔레메트리 바 — 왼쪽은 붙어 있는 단(로켓 → 2단·우주선), 오른쪽은 착륙 대상의 이름·착륙 단계·속도·고도·목표 (14단계, D-52). `update(timeline, landingBody)` |
| `landingSiteModel.js` | `createLandingPad(downrangeM)`, `createDroneShip(downrangeM)`, `groundPointToScene(downrangeM)` | 착륙장 패드(콘크리트 원반 + 노란 링)와 무인선(바다 원반 + 갑판). 진행 방향 거리 s를 각도 s/R로 바꿔 구 표면에 놓는다 (13단계) |
| `landingTarget.js` | `selectLandingTarget(bodies)`, `bodyAltitude`, `bodySpeed`, `landingPhaseLabel` | 회수 단 가운데 아직 내려오는 중이면서 고도가 가장 낮은 것을 고른다. 모두 내려앉으면 마지막으로 접지한 단을 계속 비춘다 (D-42). Three.js도 DOM도 쓰지 않는 순수 계산이라 `tests/physics.test.js`에서 그대로 검증한다 (14단계) |
| `pipView.js` | `createPipView(sceneApi, overlayHost)` | 같은 장면을 두 번째 카메라로 렌더러의 일부 영역에 덧그린다(`setViewport` + `setScissor`). 그릴 사각형은 CSS로 배치한 `.pip-view` 요소의 실제 위치를 재서 정한다. 카메라는 대상의 국소 수직을 위쪽으로 삼아 발사 평면 바깥(+z)에서 옆으로 본다. `setTarget(group, label)`, `setPhase(text)`, `render()`, `clear()` (14단계) |
| `launchController.js` | `createLaunchController(sceneContainer, hudContainer, spec, {onComplete})` | 위 모듈을 조립. 매 프레임 시뮬레이션 전진 → 물리 좌표를 화면 좌표로 변환해 로켓 배치(추력 방향으로 회전) → 카메라·HUD 갱신. `launch()`, `reset()`, `timeline` (11단계). 분리 사건이 오면 단을 떼어내 `detachedGroups`에 넣고 매 프레임 각 물체의 위치에 놓는다 (12단계). 회수 단은 국소 수직 자세로 세우고 착륙 연소 중 화염을 켠다. 착륙장은 처음부터, 무인선은 유도가 위치를 확정하는 순간 만든다 (13단계). 매 프레임 `refreshViews()`가 착륙 대상을 다시 골라 보조 화면과 HUD에 넘기고, 주 화면을 그린 뒤 `pip.render()`를 부른다 (14단계) |

- `main.js`는 `launchController.js`를 동적 `import()`로 불러온다. 3D를 지원하지 않는 환경에서도 계산기 부분은 동작하게 하기 위함이다.

## 15단계에서 추가된 파일

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `cruiseScene.js` | `createCruiseScene(container)` | 우주 항행 장면. 별 배경(광행차·도플러 적용), 워프 선, 멀어지는 지구와 다가오는 목적지 천체, 우주선. 아주 먼 거리는 겉보기 크기로 그린다 (D-53). 천체가 점보다 작을 때는 위치 표식을 띄운다. `setBodies(지구, 목적지)`, `setProgress(journey, β)`, `show/hide/start/stop` |
| `cruiseHud.js` | `createCruiseHud(container)` | 항행 계기판. 목적지, 진행 막대, 남은·지나온 거리, 지구·우주선 시간, β와 γ. `update(info)`, `setVisible(on)` |

`launchController.js`에 `skip()`과 `setHudVisible(on)`이 추가되어 임무 조작 막대가 발사 구간을 건너뛰고 항행 화면으로 넘어갈 수 있다.

## 18단계에서 추가된 것

| 파일 | 내용 |
|---|---|
| `cockpit.js` | 조종석 내부. 카메라의 자식으로 창틀·계기판·조준선을 붙인다. 1인칭에서만 보인다 (D-70) |
| `earthTexture.js` | 캔버스로 그린 지구 표면 텍스처(바다·대륙·사막·극지방·구름)와 발사장 좌표에 맞춘 회전각 (D-69) |
| `landingScene.js` | 17단계에 이어, 착륙 다리 전개와 지구 재진입 불꽃을 추가 (D-66, D-67) |
| `cruiseScene.js` | 조종석과 자세 조종(WASD·방향키, R로 복귀)을 추가. 목적지가 조준선 안에 있는지 `onTarget`으로 알려준다 (D-68, D-70) |
| `rocketModel.js` | 인터스테이지·격자 날개·착륙 다리·노즐 9기·마하 디스크 화염으로 실제 팔콘 헤비에 가깝게 (R-9) |
| `launchScene.js` | 지구에 표면 텍스처를 입히고 발사장 좌표에 맞춰 돌린다. 발사 단지 지면을 깐다 (D-69) |
