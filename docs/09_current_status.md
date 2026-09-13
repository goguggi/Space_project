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
| 완료 단계 | 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20 |
| 진행 중 | 없음. 다음은 **16단계 (설계한 로켓 불러오기)** |
| 남은 단계 | 16 → 8 → 9 (순서는 [04_roadmap.md](04_roadmap.md)) |
| 검증 | `tests/physics.test.html` 108 / 108 통과 |

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
| 13 | 재착륙 유도: 부스트백 → 낙하 → 호버슬램 → 최종 접근. 부스터는 착륙장(2 km), 코어는 무인선에 1.5 m/s로 착륙 | `src/data/landingSites.js`, `src/physics/landingGuidance.js`, `src/launch/landingSiteModel.js` |
| 14 | 화면 분할: 착륙 장면 보조 화면(왼쪽 아래 인셋), 착륙 대상 자동 전환, 아래쪽 두 칸 텔레메트리 바 | `src/launch/pipView.js`, `landingTarget.js`, `launchHud.js` |
| 15 | 우주 항행 장면(천체 12개, 광행차·도플러), 전체 화면 배치와 제어 패널, 임무 시계로 3D·스톱워치·막대 그래프·생존 표 실시간 연동 | `src/launch/cruiseScene.js`, `cruiseHud.js`, `src/physics/journey.js`, `src/data/celestialBodies.js`, `src/ui/missionBar.js` |
| 17 | 시점 전환(1인칭·3인칭·광역), Web Audio 배경음악·효과음, 발사장 구글지도, 달·화성 착륙씬, 왕복 연출 | `src/ui/viewControls.js`, `launchSiteMap.js`, `src/audio/spaceAudio.js`, `src/launch/landingScene.js`, `landingHud.js` |
| 18 | 지구 재착륙, 구간 클릭 재생, 발사 단축(5배속+자동 전환), 로런츠 곡선, 조종석 1인칭과 자세 조종, 거리 기준 재생 시간(5~60초), KSP식 착륙 절차와 등급, 캔버스 지구 표면, 현실감 있는 로켓 | `src/physics/missionTimeline.js`, `landingMission.js`, `src/ui/lorentzChart.js`, `missionChapters.js`, `landingChecklist.js`, `src/launch/cockpit.js`, `earthTexture.js`, `src/data/earthOutline.js` |
| 19 | 상승 이정표 7개와 건너뛰기(숫자키 1~7), 3인칭·광역에서 마우스 우클릭 시점 회전 | `src/physics/ascentMission.js`, `src/ui/ascentChecklist.js`, `launchController.js` |
| 20 | 우주인 지표 탐사(임무 5개), 착륙 실패 폭발과 다시 시도, 심우주 탐사선 형상, 선내 재현, 목적지 이륙과 지구 귀환, 시작 지점 체크 | `src/physics/exploration.js`, `src/ui/evaPanel.js`, `src/launch/spacecraftModel.js`, `interior.js`, `landingScene.js` |
| 기능 2 계획 | 로켓 설계 프로그램 인수 문서, JSON 계약 예제 | [08_rocket_design_handoff.md](08_rocket_design_handoff.md), `docs/examples/falcon_heavy.rocket.json` |

## 3. 다음 할 일: 16단계 설계한 로켓 불러오기 (아직 시작 안 함)

[04_roadmap.md](04_roadmap.md) 16단계, 계약은 [08_rocket_design_handoff.md](08_rocket_design_handoff.md)와 `docs/examples/falcon_heavy.rocket.json`.
- 설계 프로그램이 낸 JSON을 읽어 `state.rocketSpec`으로 쓴다. 발사 물리는 처음부터 그 형식(`stages[]`)이므로 파일만 갈아 끼우면 된다.
- 미결: 설계 저장소 주소(Q-23), 부품 목록 주체(Q-21).

20단계에서 알게 된 것:
- **OrbitControls는 `enabled = false` 여도 `update()`가 카메라를 제 자리로 되돌린다.** 1인칭처럼 카메라를 직접 다룰 때는 `update()` 자체를 부르지 않아야 한다. (우주인 머리 카메라가 계속 튕겨 나가던 원인)
- 캐릭터 조작은 속도를 지수적으로 목표치에 붙이면(`v += (target − v)·(1 − e^(−rate·dt))`) 프레임 간격이 달라져도 같은 느낌이 난다.
- 탐사를 마친 뒤 항행 화면으로 바로 넘기면 "뒤로 감기"처럼 보인다. 지표에서 실제로 떠오르는 이륙 연출을 넣어야 자연스럽다 (D-80). 착륙 프로파일을 시간축으로 뒤집으면 그대로 상승 곡선이 된다.
- 귀환 구간에서는 우주선 기수를 180° 돌려야 한다 (D-81).
- **방침 변경**: 착륙 실패(폭발)를 도입했다 (D-75). D-41·D-67의 "항상 성공"은 목적지·지구 착륙에서는 더 이상 적용되지 않는다. 부스터·코어 회수는 그대로 항상 성공.
- 파손 뒤에도 시계가 계속 돌면 `finishLanding`이 반복 호출되어 "다시 시도" 버튼이 매 프레임 다시 만들어진다. `phase = 'crashed'`로 시계를 멈춘다.
- 선내는 카메라의 자식이 아니라 **장면에 고정**해야 고개를 돌릴 때 방이 따라 돌지 않는다.
- 선내 치수는 화각에서 거꾸로 계산한다. 눈에서 격벽까지 1.8, 화각 76°면 화면 반높이가 1.8·tan38° ≈ 1.41. 창과 계기판을 그 안에 넣어야 잘리지 않는다.

19단계에서 알게 된 것:
- 발사 장면은 카메라를 매 프레임 다시 잡으므로 OrbitControls로는 시점을 돌릴 수 없다. 사용자의 회전각(yaw·pitch)과 거리를 따로 들고 있다가 로켓 기준 자리를 그 값으로 계산한다 (D-74).
- `tools/build_single.py`의 import 경로 정규식이 HTML 속성 안의 `id="mission-from"` 같은 글자에 걸렸다. 모듈 경로처럼 생긴 것만 바꾸도록 안전장치를 넣었다.
- 상승 이정표 건너뛰기는 `timeline.advance(2초)`를 조건이 맞을 때까지 반복한다. 물리 적분 간격은 그대로라 정확도가 변하지 않는다.

18단계에서 알게 된 것:
- **화면이 옆으로 돌아 보이던 문제**: 발사 후 로켓이 피치 프로그램으로 눕는데 카메라 오프셋이 세계 좌표에 고정돼 있었다. 오프셋을 로켓의 국소 수직에 맞춰 돌리고 `camera.up`도 국소 수직으로 두어 해결 (D-71).
- 장면 층(`.scene-layer`) 세 개가 겹쳐 있어 숨은 층이 마우스를 가로챘다. 빈 층은 `pointer-events: none`, 캔버스만 `auto`로 돌려놓았다.
- 착륙 3인칭 카메라가 고도에 비례해 멀어지면 우주선이 점이 되어 재진입 불꽃이 안 보인다. 거리 상한을 뒀다.
- 재생 시간을 "지구 시간"이 아니라 "거리"로 정하니 목적지마다 값이 고정되어 거리 차이가 훨씬 잘 느껴진다 (D-63).
- 착륙 연출에 임무 배속을 그대로 곱하면 5배속에서 2초 만에 끝나 절차를 누를 틈이 없다. 착륙은 2배까지만 적용한다.
- 조종석은 카메라의 자식으로 붙이되, 카메라를 `scene.add(camera)` 해야 그려진다.
- 착륙 1인칭에서 똑바로 아래만 보면 지면만 가득 차 화면이 하얘진다. 앞아래 35°쯤을 보게 했다.
- 지구 텍스처의 대륙 윤곽이 거칠어 발사대가 바다 위에 놓일 수 있다. 발사 단지 지면(반지름 12 km)을 따로 깔아 해결했다.

17단계에서 알게 된 것:
- 시점을 바꿀 때 천체 크기를 다시 잡지 않으면 광역 시점의 크기가 남아 1인칭에서 화성이 코앞에 있는 것처럼 보인다. `refreshBodies()`가 마지막 진행 상태로 다시 계산한다.
- 브라우저는 사용자가 한 번 누르기 전에 소리를 내지 못한다. 그래서 "소리 켜기" 버튼에서 `audio.resume()`을 부른다.
- 구글지도 iframe은 다른 출처라 내용을 읽을 수 없다. 오프라인 판정은 `load` 사건으로만 하고, 안 뜨면 좌표·링크를 대신 보여준다.
- 착륙 연출 동안에는 임무 시계를 멈추고 착륙 진행률을 따로 돌린다. 왕복이면 끝나고 이륙해 항행을 이어간다.

15단계에서 알게 된 것:
- 아주 먼 거리는 실제 축척으로 그릴 수 없다. 겉보기 크기(각반지름)만 맞추면 달부터 안드로메다까지 같은 코드로 그려진다 (D-53).
- 광행차 공식의 방향에 주의. 관측자(우주선)에서 보이는 각은 cos θ′ = (cos θ + β)/(1 + β cos θ)이다. 부호를 반대로 쓰면 별이 뒤로 몰려 화면이 텅 빈다. 검증 항목 4개로 막아 두었다.
- 임무 시계 하나(진행률)로 모든 화면을 구동하면 연동이 저절로 맞는다. 막대 그래프는 DOM을 한 번만 만들고 폭만 바꿔야 매 프레임 갱신이 버틴다.
- 항행 장면은 발사 장면과 별도의 렌더러를 쓰고 캔버스를 번갈아 보인다. 전환은 `enterCruise()` / `resetMission()`.

**마지막 검증 결과** (헤드리스 브라우저, 2026-09-05)

| 확인 | 결과 |
|---|---|
| 검증 페이지 | 46 / 46 통과 |
| 발사 → 건너뛰기 → 자동 항행 진입 | 정상 (phase: launch → cruise, 자동 재생) |
| 프록시마 왕복 0.99c 절반 시점 | 지구 4.29년 / 우주선 221일, γ = 7.0888, 하루살이만 사망 |
| 진행 슬라이더 끌기 | 3D·스톱워치·막대 그래프·생존 표가 함께 이동 |
| 처음으로 | 발사 대기 상태로 복귀 |
| 콘솔 오류 | 없음 |

## 4. 다른 컴퓨터에서 Claude Code가 이어서 하는 절차

사용자는 저장소를 받은 뒤 Claude Code에 "이어서 해"라고만 말한다. Claude Code는 아래를 스스로 한다.
(작업 규칙 전체는 저장소 최상위의 `CLAUDE.md`에 있다. Claude Code가 자동으로 읽는다.)

1. 이 문서와 [04_roadmap.md](04_roadmap.md)의 다음 단계, [06_decisions.md](06_decisions.md)의 결정·미결 질문을 읽는다.
2. 환경 확인: `git config user.name`이 비어 있으면 커밋 명령에 `-c user.name="genai06" -c user.email="genai06@cdsai.kr"`를 붙인다. PowerShell·Python·Node 중 무엇이 있는지 확인한다.
3. 로컬 서버를 띄운다. `.claude/launch.json`의 `local-server`(PowerShell 스크립트 `tools/serve.ps1`)를 쓰고, PowerShell이 없으면 `python -m http.server 8000`으로 바꿔 `launch.json`을 고친다.
4. http://localhost:8000/tests/physics.test.html 에서 "108 / 108 통과"를 확인한다.
5. 3절의 다음 단계(16단계)를 구현한다. 완료 조건을 만족하면 커밋·푸시하고 이 문서를 갱신한다.
6. 푸시 시 GitHub 로그인 창이 뜨면 사용자에게 로그인만 요청한다.

## 5. 이어서 할 때 읽는 순서 (Claude Code용)

1. `CLAUDE.md` (규칙) → 이 문서 (현재 상황)
2. [04_roadmap.md](04_roadmap.md) 16단계 항목과 [08_rocket_design_handoff.md](08_rocket_design_handoff.md)
3. `src/data/falconHeavy.js`(제원 형식), `src/physics/launchDynamics.js`(stages[] 사용), `src/main.js`(`state.rocketSpec`)
4. 결정이 필요한 일이 생기면 [06_decisions.md](06_decisions.md) 4절에 Q-번호로 적고 사용자에게 묻는다

## 5.1 이번 세션에서 검증에 쓴 방법 (같은 방식으로 이어서 검증)

브라우저 미리보기 탭에서 자바스크립트를 실행해 상태를 읽는다. 예:

```javascript
// 발사 후 건너뛰기까지 실행하고 분리된 단들의 결과를 본다
document.getElementById('launch-button').click();
document.getElementById('hud-skip').click();
const s = window.__state.launch.timeline.sim;
s.bodies.map(b => `${b.stageId}: ${b.status} 접지속도=${(b.impactSpeed||0).toFixed(1)} 목표=${b.targetDownrange} 실제=${6371000*Math.atan2(b.r.x,b.r.y)}`);
window.__state.launch.timeline.getEvents().map(e => e.type + ':' + (e.label||'') + '@' + Math.round(e.time));
```

이 기준은 `tests/physics.test.js`의 재착륙 검증 7개로 자동 확인된다. 주의: 브라우저의 ES 모듈 캐시 때문에 코드를 고친 뒤에는 페이지를 새로 불러와야(주소 뒤에 `?r=2` 같은 값을 붙여) 바뀐 모듈이 실행된다.

## 6. 알아 둘 것

- 브라우저 탭이 숨겨지면 애니메이션 프레임이 멈춘다. 발사 장면은 setTimeout으로 시뮬레이션만 계속 돌리도록 해 두었지만, 화면 확인은 탭을 앞에 둔 상태에서 한다.
- `tools/serve.ps1`은 UTF-8 BOM으로 저장해야 한다 (한글 주석 때문). 편집 후 BOM이 사라지면 PowerShell이 구문 오류를 낸다.
- 개발 중 브라우저 콘솔에서 `window.__state` 로 현재 선택값·계산 결과·발사 컨트롤러를 볼 수 있다. `window.__state.launch.timeline.sim.bodies` 가 분리된 단들의 상태다.
- 서버 없이 볼 수 있는 파일 하나짜리 실행본이 저장소 최상위에 있다: `열기.html`(본체), `검증.html`(검증 페이지). `tools/build_single.py`가 만든다. **코드를 고치면 반드시 다시 실행해서 갱신한다.**
- 로켓 설계 담당 팀원에게는 [08_rocket_design_handoff.md](08_rocket_design_handoff.md)와 `docs/examples/falcon_heavy.rocket.json`을 전달한다. 설계 저장소 주소는 아직 미정(Q-23).
