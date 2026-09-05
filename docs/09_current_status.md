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
| 완료 단계 | 0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14 |
| 진행 중 | 없음. 다음은 **15단계 (발사 장면과 결과 화면 연결)** |
| 남은 단계 | 15 → 16 → 8 → 9 (순서는 [04_roadmap.md](04_roadmap.md)) |
| 검증 | `tests/physics.test.html` 31 / 31 통과 |

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
| 기능 2 계획 | 로켓 설계 프로그램 인수 문서, JSON 계약 예제 | [08_rocket_design_handoff.md](08_rocket_design_handoff.md), `docs/examples/falcon_heavy.rocket.json` |

## 3. 다음 할 일: 15단계 발사 장면과 결과 화면 연결 (아직 시작 안 함)

[04_roadmap.md](04_roadmap.md) 15단계 항목을 따른다. 요지:
- 2단 분리 후 "우주선이 지정 속도(3단계에서 고른 값)로 출발"하는 전환 연출을 넣는다.
- 발사 → 분리 → 착륙 → 출발 → 스톱워치(6단계) → 결과 표·수명 비교(5·7단계)로 끊김 없이 이어지게 한다.
- 완료 조건: 위 흐름이 한 번의 조작으로 이어진다.

붙일 자리:
- `src/launch/launchController.js`의 `handlers.onComplete(events)` 가 이미 `complete` 사건에서 불린다. `src/main.js`가 이것을 받아 스톱워치를 시작하면 된다.
- `complete` 사건에는 그 순간의 우주선 상태 `{ r, v }` 가 들어 있다 (`launchDynamics.js`).
- 착륙은 우주선 출발 뒤에도 계속 진행되므로(12단계), 결과 화면으로 넘어가도 보조 화면은 남겨 둘지 정해야 한다 → 필요하면 Q-번호로 묻는다.

14단계에서 알게 된 것:
- 보조 화면은 주 화면과 **같은 렌더러**를 쓴다. `launchScene`의 `onAfterRender(fn)`이 주 화면을 그린 직후에 불리고, 그 안에서 `setScissorTest(true)` + `setViewport`/`setScissor`로 영역을 제한해 두 번째 카메라로 다시 그린다. 끝나면 반드시 `setScissorTest(false)`와 전체 뷰포트로 되돌린다.
- 그릴 사각형은 CSS로 배치한 `.pip-view` 요소의 `getBoundingClientRect()`를 캔버스 기준으로 바꿔서 정한다. WebGL의 y는 아래에서 위로 재므로 `y = 캔버스아래 − 요소아래`.
- 착륙 대상 고르기는 `src/launch/landingTarget.js`의 `selectLandingTarget(bodies)`. Three.js도 DOM도 쓰지 않아 검증 페이지에서 바로 확인한다.
- 접지 시각을 `body.landedAt`에 기록하도록 `launchDynamics.js`를 조금 고쳤다.

**마지막 검증 결과** (헤드리스 브라우저로 전체 실행, 2026-09-05)

| 물체 | 결과 | 접지 속도 | 목표 / 실제 위치 | 접지 시각 |
|---|---|---|---|---|
| 측면 부스터 2기 | 착륙 성공 | 1.5 m/s | 2,000 m / 2,001 m | T+10:42 |
| 중앙 코어 | 착륙 성공 | 1.5 m/s | 무인선 451 km / 451 km | T+12:01 |

보조 화면은 T+2:29(첫 분리)부터 끝까지 떠 있고, 부스터 착륙(T+10:42) 뒤 중앙 코어로 자동 전환된다. 콘솔 오류 없음.

## 4. 다른 컴퓨터에서 Claude Code가 이어서 하는 절차

사용자는 저장소를 받은 뒤 Claude Code에 "이어서 해"라고만 말한다. Claude Code는 아래를 스스로 한다.
(작업 규칙 전체는 저장소 최상위의 `CLAUDE.md`에 있다. Claude Code가 자동으로 읽는다.)

1. 이 문서와 [04_roadmap.md](04_roadmap.md)의 다음 단계, [06_decisions.md](06_decisions.md)의 결정·미결 질문을 읽는다.
2. 환경 확인: `git config user.name`이 비어 있으면 커밋 명령에 `-c user.name="genai06" -c user.email="genai06@cdsai.kr"`를 붙인다. PowerShell·Python·Node 중 무엇이 있는지 확인한다.
3. 로컬 서버를 띄운다. `.claude/launch.json`의 `local-server`(PowerShell 스크립트 `tools/serve.ps1`)를 쓰고, PowerShell이 없으면 `python -m http.server 8000`으로 바꿔 `launch.json`을 고친다.
4. http://localhost:8000/tests/physics.test.html 에서 "31 / 31 통과"를 확인한다.
5. 3절의 다음 단계(15단계)를 구현한다. 완료 조건을 만족하면 커밋·푸시하고 이 문서를 갱신한다.
6. 푸시 시 GitHub 로그인 창이 뜨면 사용자에게 로그인만 요청한다.

## 5. 이어서 할 때 읽는 순서 (Claude Code용)

1. `CLAUDE.md` (규칙) → 이 문서 (현재 상황)
2. [04_roadmap.md](04_roadmap.md) 15단계 항목과 [06_decisions.md](06_decisions.md)의 결정 표
3. `src/launch/launchController.js`(`handlers.onComplete`, `refreshViews`), `src/main.js`(발사 장면과 계산기 연결), `src/ui/stopwatch.js`
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
- 로켓 설계 담당 팀원에게는 [08_rocket_design_handoff.md](08_rocket_design_handoff.md)와 `docs/examples/falcon_heavy.rocket.json`을 전달한다. 설계 저장소 주소는 아직 미정(Q-23).
