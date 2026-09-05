# 09. 현재 상황 (다른 환경에서 이어서 하기 위한 인수인계)

작성일: 2026-09-05
목적: 다른 컴퓨터에서 GitHub 저장소를 받아 바로 이어서 개발할 수 있도록, 지금까지 한 일과 다음에 할 일을 한 파일에 정리한다.
이 문서는 단계가 끝날 때마다 갱신한다.

---

## 1. 한눈에 보기

| 항목 | 상태 |
|---|---|
| 저장소 | https://github.com/goguggi/Space_project (main 브랜치) |
| 게시 사이트 | https://goguggi.github.io/Space_project/ (GitHub Pages, main 루트, 푸시하면 1~2분 뒤 자동 갱신) |
| 완료 단계 | 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12 |
| 진행 중 | **13단계 (재착륙 유도)** — 코드는 올라가 있으나 검증 미완료 (3절) |
| 남은 단계 | 13 마무리 → 14 → 15 → 16 → 8 → 9 (순서는 [04_roadmap.md](04_roadmap.md)) |
| 검증 | `tests/physics.test.html` 19 / 19 통과 (13단계 변경 전 기준) |

## 2. 완료된 것

| 단계 | 내용 | 핵심 파일 |
|---|---|---|
| 0 | 계획 문서 8개, 폴더 골격, Git | `docs/` |
| 1 | 발사장 5곳 선택 | `src/data/launchSites.js`, `src/ui/launchSiteSelector.js` |
| 2 | 천체 12개 선택, 물리 상수, 단위 변환 | `src/data/destinations.js`, `constants.js`, `src/utils/units.js` |
| 3 | 로그 눈금 속도 슬라이더, 프리셋 6개, γ 표시 | `src/physics/lorentz.js`, `src/ui/speedSlider.js`, `speedPresets.js`, `lorentzDisplay.js` |
| 4 | 시간 지연 계산 엔진, 편도/왕복, 검증 페이지 | `src/physics/timeDilation.js`, `tests/physics.test.*` |
| 5 | 결과 수치 표, 시간 서식 | `src/utils/formatTime.js`, `src/ui/resultTable.js` |
| 6 | 스톱워치 애니메이션 (3~15초, 년/일/시/분/초) | `src/ui/stopwatch.js` |
| 7 | 생물 5종 수명 비교: 출발 나이 입력, 로그 막대 그래프, 생존 아이콘 | `src/data/organisms.js`, `src/physics/survival.js`, `src/ui/departureAgeInput.js`, `lifespanChart.js`, `survivalIcons.js` |
| 10 | Three.js r170 동봉, 3D 장면(실제 비율 지구, 발사대, 별) | `lib/three/`, `src/launch/launchScene.js` |
| 11 | 팔콘 헤비 제원, 발사 물리(추력·중력·질량·단 분리·피치 프로그램), 로켓 모델, 추적 카메라, HUD, 발사 버튼 | `src/data/falconHeavy.js`, `src/physics/launchDynamics.js`, `src/launch/*`, `src/ui/launchButton.js` |
| 12 | 분리된 단의 독립 낙하, 3D에서 단 떼어내기, 우주선 출발 후에도 진행 | `launchDynamics.js`(bodies), `rocketModel.js`(detachStage), `launchController.js` |
| 기능 2 계획 | 로켓 설계 프로그램 인수 문서, JSON 계약 예제 | [08_rocket_design_handoff.md](08_rocket_design_handoff.md), `docs/examples/falcon_heavy.rocket.json` |

## 3. 진행 중: 13단계 재착륙 유도 (검증 미완료)

**만든 파일** (커밋됨, 동작은 부분적)
- `src/data/landingSites.js`: 착륙장(발사대에서 진행 방향 2 km, 가상), 무인선(코어 분리 시점의 탄도 낙하 예측 지점), 유도 매개변수
- `src/physics/landingGuidance.js`: 국소 평면 근사로 남은 낙하 시간·낙하 지점 예측, 단계 기계(coast 5초 → boostback → fall → landing → landed), 호버슬램 착륙 연소
- `src/launch/landingSiteModel.js`: 착륙장 패드와 무인선 3D 모델
- `launchDynamics.js`: 회수 단에 유도 가속도 적용, 착륙 연료 소모 기록 (예비 5%를 초과해도 착륙은 계속: D-41과 D-21의 결과)
- `launchController.js`: 착륙장 항상 표시, 코어 분리 시 무인선 생성, 회수 단은 국소 수직 자세로 하강, 착륙 연소 중 화염 표시

**마지막 검증 결과** (건너뛰기로 전체 실행)

| 물체 | 결과 | 접지 속도 | 목표 / 실제 위치 |
|---|---|---|---|
| 측면 부스터 2기 | **충돌 (실패)** | 146.5 m/s | 목표 +2 km / 실제 −2 km |
| 중앙 코어 | 착륙 성공 | 2,666 m/s로 기록됨 (판정은 landed) | 목표 1,782 km / 실제 1,891 km |

**남은 문제와 짚어볼 곳**
1. 부스터가 부스트백으로 되돌아온 뒤 착륙 연소가 늦게 시작되거나 감속 상한(4g)이 부족해 146 m/s로 접지한다.
   `landingGuidance.js`의 `fall` 단계에서 `landingBurnAltitude`에 여유(`landingMarginM`)를 더 주거나, `landing` 단계에서 `needed` 감속 계산이 고도 0.5 m 하한 때문에 막판에 튀는지 확인한다.
2. 코어는 `landed` 판정이 났는데 `impactSpeed`가 2,666 m/s로 기록되어 있다. 접지 판정(`landed || alt <= 0`) 순서와 속도 기록 시점을 점검한다. 실제 위치도 목표에서 109 km 벗어난다(수평 보정 상한 0.5g가 부족하거나 예측 근사 오차).
3. 공기 저항이 없어(D-21) 재진입 속도가 실제보다 훨씬 커서 착륙 연료가 예비 5%를 크게 넘는다(부스터 39 t, 코어 31 t). 이는 문서화된 한계이며, 필요하면 [06_decisions.md](06_decisions.md)에 결정 항목으로 추가한다.
4. 부스터 접지 속도 5 m/s 미만이 되면 `tests/physics.test.js`에 "부스터·코어 착륙 성공" 검증 항목을 추가한다.

**13단계 완료 조건** ([04_roadmap.md](04_roadmap.md)): 부스터 2기는 착륙장에, 코어는 무인선에 속도 거의 0으로 내려앉는다.

## 4. 다른 컴퓨터에서 시작하는 방법

1. 저장소 받기

```bash
git clone https://github.com/goguggi/Space_project.git
```

2. 커밋 작성자 설정 (처음 한 번)

```bash
git config user.name "이름"
```

```bash
git config user.email "이메일"
```

3. 로컬 서버로 열기 (더블클릭으로 열면 ES 모듈이 막힌다). 저장소 최상위에서:

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Python이 있는 환경이면 대신 `python -m http.server 8000` 도 된다. 브라우저에서 http://localhost:8000 을 연다.

4. 검증 페이지: http://localhost:8000/tests/physics.test.html 에서 "19 / 19 통과"를 확인한다.

5. 푸시할 때 GitHub 로그인 창이 뜨면 로그인한다 (Git Credential Manager). 토큰을 파일에 적지 않는다.

## 5. 이어서 할 때 읽는 순서

1. 이 문서 (현재 상황)
2. [04_roadmap.md](04_roadmap.md) 13단계 항목과 [03_physics.md](03_physics.md) 6.5절 (착륙 유도 공식)
3. `src/physics/landingGuidance.js`, `src/physics/launchDynamics.js`의 `integrateBody`
4. 결정이 필요한 일이 생기면 [06_decisions.md](06_decisions.md) 4절에 질문을 추가하고 팀에 묻는다

AI 도우미에게 이어서 시키려면: "docs/09_current_status.md를 읽고 13단계 재착륙 유도부터 이어서 진행해 줘. 규칙은 docs/02_architecture.md와 06_decisions.md를 따르고, 결정이 필요한 건 물어봐."

## 6. 알아 둘 것

- 브라우저 탭이 숨겨지면 애니메이션 프레임이 멈춘다. 발사 장면은 setTimeout으로 시뮬레이션만 계속 돌리도록 해 두었지만, 화면 확인은 탭을 앞에 둔 상태에서 한다.
- `tools/serve.ps1`은 UTF-8 BOM으로 저장해야 한다 (한글 주석 때문). 편집 후 BOM이 사라지면 PowerShell이 구문 오류를 낸다.
- 개발 중 브라우저 콘솔에서 `window.__state` 로 현재 선택값·계산 결과·발사 컨트롤러를 볼 수 있다. `window.__state.launch.timeline.sim.bodies` 가 분리된 단들의 상태다.
- 로켓 설계 담당 팀원에게는 [08_rocket_design_handoff.md](08_rocket_design_handoff.md)와 `docs/examples/falcon_heavy.rocket.json`을 전달한다. 설계 저장소 주소는 아직 미정(Q-23).
