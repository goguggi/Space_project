// 프로그램 진입점
// 역할: 화면 구성 요소를 만들어 연결하고, 임무 시계(mission clock) 하나로 전부를 함께 움직인다.
// 계산이나 그리기는 직접 하지 않는다.
//
// 임무 단계 (15단계, D-55):
//   ready  발사 대기 — 발사대 위 로켓
//   launch 발사 진행 — 3D 발사·단 분리·재착륙 (11~14단계)
//   cruise 항행     — 우주선이 목적지로 간다. 진행률 하나가 3D 장면·스톱워치·막대 그래프·생존 표를 함께 움직인다
//   arrived 도착    — 진행률 1. 슬라이더를 끌면 어느 시점이든 다시 볼 수 있다
//
// 진행률(progress)은 항행 구간의 0~1이다. 재생 길이는 거리로 정한다 (physics/journey.js, 편도 5~60초, D-63).
//   18단계: reentry 단계(왕복의 지구 재착륙)가 추가되었다.

import { createLaunchSiteSelector } from './ui/launchSiteSelector.js';
import { createDestinationSelector } from './ui/destinationSelector.js';
import { createSpeedSlider } from './ui/speedSlider.js';
import { createSpeedPresets } from './ui/speedPresets.js';
import { createLorentzDisplay } from './ui/lorentzDisplay.js';
import { createTripTypeSelector } from './ui/tripTypeSelector.js';
import { createResultTable } from './ui/resultTable.js';
import { createStopwatch } from './ui/stopwatch.js';
import { createDepartureAgeInput } from './ui/departureAgeInput.js';
import { createLifespanChart } from './ui/lifespanChart.js';
import { createSurvivalIcons } from './ui/survivalIcons.js';
import { createMissionBar } from './ui/missionBar.js';
import { createViewControls } from './ui/viewControls.js';
import { createLaunchSiteMap } from './ui/launchSiteMap.js';
import { createSpaceAudio } from './audio/spaceAudio.js';
import { createLorentzChart } from './ui/lorentzChart.js';
import { createMissionChapters } from './ui/missionChapters.js';
import { createLandingChecklist } from './ui/landingChecklist.js';
import { missionChapters, currentChapter } from './physics/missionTimeline.js';
import { activeStep, missedSteps, descentPenalty, aimBonus, LANDING_STEPS } from './physics/landingMission.js';
import { computeTimeDilation, TRIP_TYPES } from './physics/timeDilation.js';
import { judgeAll } from './physics/survival.js';
import { journeyAt, travelDurationSeconds, beta as toBeta } from './physics/journey.js';
import { gamma } from './physics/lorentz.js';
import { formatDistance, formatNumber } from './utils/units.js';
import { ORGANISMS } from './data/organisms.js';
import { getBodyVisual, isLandable, CELESTIAL_BODIES } from './data/celestialBodies.js';
import { descentProfile } from './physics/landingGuidance.js';

// ---- 사용자의 현재 선택과 임무 상태 ----
const state = {
  launchSite: null,    // 1단계
  destination: null,   // 2단계
  speed: null,         // 3단계
  tripType: null,      // 4단계
  result: null,        // 4단계: computeTimeDilation 결과 (초)
  departureAges: {},   // 7단계
  // 15단계 임무 시계
  phase: 'ready',
  progress: 0,
  playing: false,
  timeScale: 1,
  launch: null,        // 발사 장면 (동적 import)
  cruise: null,        // 항행 장면 (동적 import)
  landing: null,       // 착륙 장면 (동적 import)
  // 17단계
  view: 'third',       // 1인칭 / 3인칭 / 광역
  landingProgress: 0,  // 착륙 연출 진행률 (0~1)
  visitedTarget: false,// 목적지 도착(착륙 또는 근접)을 이미 마쳤는가. 왕복 반환점 판정에 쓴다
  // 18단계
  landingBody: null,   // 지금 착륙 중인 천체 (목적지 또는 지구)
  landingSteps: {},    // 절차 id → 수행 여부 (D-67)
  aimSeconds: 0,       // 목적지를 조준선 안에 둔 시간 (D-68)
  cruiseSeconds: 0,    // 항행에 쓴 시간
  chapters: [],
};

// 착륙 시작 고도 (m). 실제 하강 유도는 훨씬 높은 곳에서 시작하지만, 화면에서는 마지막 구간만 보여준다.
// 지구는 대기가 있어 재진입부터 보여주므로 celestialBodies의 landingStartAltitudeM를 쓴다 (D-66)
const LANDING_START_ALTITUDE = 2_000;
const LANDING_SECONDS = 10;

const el = (id) => document.getElementById(id);

// ---- 결과를 그리는 구성 요소 (입력 구성 요소보다 먼저 만든다) ----
const resultTable = createResultTable(el('result-table-container'));
const stopwatch = createStopwatch(el('stopwatch-container'));
const lifespanChart = createLifespanChart(el('lifespan-chart-container'));
const survivalIcons = createSurvivalIcons(el('survival-container'));

// ---- 임무 조작 막대 ----
const missionBar = createMissionBar(el('mission-bar-container'), {
  onLaunch: () => startLaunch(),
  onReset: () => resetMission(),
  onTogglePlay: () => { state.playing = !state.playing; syncBar(); },
  onScrub: (p) => {
    // 슬라이더를 끌면 바로 그 시점으로. 아직 발사 전이라도 항행 화면으로 넘어간다
    if (state.phase !== 'cruise' && state.phase !== 'arrived') enterCruise({ silent: true });
    state.playing = false;
    const turnAt = state.tripType === TRIP_TYPES.ROUND_TRIP ? 0.5 : 1;
    state.visitedTarget = p >= turnAt;   // 반환점을 지난 지점으로 끌면 이미 다녀온 것으로 본다
    setProgress(p);
    if (p >= 1) finishCruise(); else if (state.phase === 'arrived') { state.phase = 'cruise'; }
    syncBar();
  },
  onTimeScale: (n) => { state.timeScale = n; state.launch?.timeline.setTimeScale(Math.max(1, Math.round(n))); syncBar(); },
  onSkip: () => {
    if (state.phase === 'launch') { state.launch?.skip(); return; }
    if (state.phase === 'landing' || state.phase === 'reentry') { updateLanding(1); finishLanding(); return; }
    if (state.phase === 'cruise') {
      const roundTrip = state.tripType === TRIP_TYPES.ROUND_TRIP;
      if (!state.visitedTarget) { setProgress(roundTrip ? 0.5 : 1); reachTarget(); return; }
      state.playing = false; setProgress(1); finishCruise();
    }
  },
});

// ---- 소리 (17단계, D-59) ----
const audio = createSpaceAudio();

// ---- 시점 전환 버튼 (17단계, D-58) ----
const viewControls = createViewControls(el('view-controls'), {
  onView: (id) => setView(id),
  onSound: (on) => audio.setEnabled(on),
});

function setView(id) {
  state.view = id;
  viewControls.setView(id);
  state.launch?.setCameraMode(id);
  state.cruise?.setCameraMode(id);
  state.landing?.setCameraMode(id);
}

function setMood(name) { audio.setMood(name); }

// ---- 임무 구간 칩 (18단계, D-65) ----
const chapters = createMissionChapters(el('mission-chapters'), {
  onSelect: (id) => playChapter(id),
});

function refreshChapters() {
  state.chapters = missionChapters({
    roundTrip: state.tripType === TRIP_TYPES.ROUND_TRIP,
    landable: isLandable(targetVisual()),
    targetName: state.destination?.name ?? '목적지',
  });
  chapters.setChapters(state.chapters);
  chapters.setCurrent(currentChapter(state.chapters, state));
}

/** 구간 칩을 누르면 그 장면을 처음부터 재생한다 */
function playChapter(id) {
  const roundTrip = state.tripType === TRIP_TYPES.ROUND_TRIP;
  if (id === 'launch') { resetMission(); startLaunch(); return; }
  if (id === 'orbit') { state.visitedTarget = false; enterCruise(); return; }
  if (id === 'outbound') { state.visitedTarget = false; enterCruise(); setProgress(0.02); state.playing = true; return; }
  if (id === 'target') {
    state.visitedTarget = false;
    enterCruise({ silent: true });
    setProgress(roundTrip ? 0.5 : 1);
    reachTarget();
    return;
  }
  if (id === 'return' && roundTrip) {
    state.visitedTarget = true;
    enterCruise({ silent: true });
    setProgress(0.52);
    state.playing = true;
    syncBar();
    return;
  }
  if (id === 'reentry' && roundTrip) {
    state.visitedTarget = true;
    enterCruise({ silent: true });
    setProgress(1);
    startReentry();
  }
}

function syncBar() {
  missionBar.update({
    phase: state.phase,
    progress: state.progress,
    playing: state.playing,
    timeScale: state.timeScale,
    ready: Boolean(state.launch && state.result),
  });
  if (state.chapters.length) chapters.setCurrent(currentChapter(state.chapters, state));
}

function setSubtitle(text) {
  el('stage-subtitle').textContent = text;
}

// ---- 입력이 바뀔 때: 시간 지연을 다시 계산하고 화면 전체를 맞춘다 ----
function recompute() {
  if (!state.destination || !state.speed || !state.tripType) return;
  state.result = computeTimeDilation({
    distance: state.destination.distance,
    speed: state.speed,
    tripType: state.tripType,
  });
  resultTable.update(state.result, {
    destinationName: state.destination.name,
    tripTypeLabel: state.tripType === TRIP_TYPES.ROUND_TRIP ? '왕복' : '편도',
  });
  lifespanChart.setResult(state.result, state.departureAges);

  // 항행 장면의 목적지 천체를 바꾼다
  if (state.cruise) {
    state.cruise.setBodies(CELESTIAL_BODIES.earth, getBodyVisual(state.destination.id));
  }
  refreshChapters();
  setProgress(state.progress);
  syncBar();
}

// 출발 나이만 바뀌었을 때는 시간 지연을 다시 계산할 필요가 없다
function renderLifespan() {
  if (!state.result) return;
  lifespanChart.setResult(state.result, state.departureAges);
  lifespanChart.setProgress(state.progress);
  updateSurvival();
}

function updateSurvival() {
  if (!state.result) return;
  const j = currentJourney();
  survivalIcons.update(judgeAll(ORGANISMS, state.departureAges, {
    earthTime: j.earthElapsed,
    shipTime: j.shipElapsed,
  }));
}

/** 지금 목적지가 내려앉을 표면이 있는 천체인가 (D-61) */
function targetVisual() {
  return state.destination ? getBodyVisual(state.destination.id) : null;
}

function targetGravity() {
  return targetVisual()?.surfaceGravity ?? 1.62;
}

function currentJourney() {
  return journeyAt({
    distance: state.destination?.distance ?? 0,
    roundTrip: state.tripType === TRIP_TYPES.ROUND_TRIP,
    result: state.result ?? { earthTime: 0, shipTime: 0 },
    progress: state.progress,
  });
}

/** 진행률을 정하고, 연결된 모든 화면을 같은 시각으로 맞춘다 (D-55) */
function setProgress(p) {
  state.progress = Math.min(Math.max(p, 0), 1);
  if (!state.result || !state.destination) return;
  const j = currentJourney();
  const b = toBeta(state.speed ?? 0);

  stopwatch.setTimes(j.earthElapsed, j.shipElapsed);
  lifespanChart.setProgress(state.progress);
  updateSurvival();

  if (state.cruise) {
    state.cruise.setProgress(j, b);
    cruiseHud?.update({
      targetName: state.destination.name,
      roundTrip: state.tripType === TRIP_TYPES.ROUND_TRIP,
      journey: j,
      beta: b,
      gamma: gamma(state.speed ?? 0),
    });
  }
  syncBar();
}

// ---- 임무 진행 ----
function startLaunch() {
  if (!state.launch || !state.result) return;
  state.phase = 'launch';
  state.timeScale = 5;                    // 발사 구간 기본 배속 (D-64)
  state.launch.timeline.setTimeScale(5);
  state.launch.launch();
  setMood('launch');
  audio.boom();
  audio.setEngine(1);
  setSubtitle('발사 진행 중 — 부스터 분리와 재착륙을 보조 화면에서 볼 수 있습니다.');
  syncBar();
}

let cruiseHud = null;
let landingHud = null;
let checklist = null;
let cruiseTicker = null;

/** 발사가 끝나면 항행 화면으로 넘어간다 */
function enterCruise({ silent = false } = {}) {
  if (!state.cruise) return;
  state.phase = 'cruise';
  state.launch?.scene.stop();
  state.launch?.setHudVisible(false);
  state.cruise.show();
  state.cruise.start();
  state.landing?.hide();
  state.landing?.stop();
  landingHud?.setVisible(false);
  cruiseHud?.setVisible(true);
  state.cruise.setCameraMode(state.view);
  setMood('cruise');
  audio.setEngine(0.18);
  // 발사 구간은 5배로 봤지만(D-64), 항행 재생 시간은 거리로 정해 두었으므로 1배로 되돌린다 (D-63)
  if (state.timeScale > 2) { state.timeScale = 1; state.launch?.timeline.setTimeScale(1); }
  if (!silent) {
    state.playing = true;
    state.progress = 0;
    state.visitedTarget = false;
  }
  setSubtitle(`${state.destination?.name ?? '목적지'}(으)로 항행 중 — 아래 슬라이더를 끌면 원하는 시점을 볼 수 있습니다.`);
  stopwatch.setStatus('시간 흐르는 중…');
  setProgress(state.progress);
  syncBar();
}

/** 목적지에 닿았을 때: 고체 표면이면 착륙 장면, 아니면 근접 통과 (D-61) */
function reachTarget() {
  state.visitedTarget = true;
  const visual = targetVisual();
  if (!state.landing || !isLandable(visual)) {
    // 근접 통과: 장면은 그대로 두고 알림만 준다
    setSubtitle(`${visual?.name ?? '목적지'} 근접 통과 — 내려앉을 표면이 없어 곁을 스쳐 지나갑니다.`);
    audio.chime();
    if (state.tripType === TRIP_TYPES.ROUND_TRIP) { state.playing = true; }
    else { finishCruise(); }
    return;
  }
  beginLanding(visual, 'landing');
}

/** 왕복의 마지막: 지구로 다시 들어와 착륙한다 (D-66) */
function startReentry() {
  beginLanding(CELESTIAL_BODIES.earth, 'reentry');
}

/** 착륙(또는 재진입) 장면을 시작한다. 절차 체크리스트도 함께 켠다 (D-67) */
function beginLanding(visual, phase) {
  state.phase = phase;
  state.landingBody = visual;
  state.playing = false;
  state.landingProgress = 0;
  state.landingSteps = {};
  state.cruise?.hide();
  state.cruise?.stop();
  cruiseHud?.setVisible(false);
  state.landing.setBody(visual);
  state.landing.setCameraMode(state.view);
  state.landing.show();
  state.landing.start();
  landingHud?.setVisible(true);
  checklist?.setVisible(true);
  checklist?.clearResult();
  setMood('landing');
  const start = landingStartAltitude();
  setSubtitle(phase === 'reentry'
    ? `지구 재진입 — 고도 ${Math.round(start / 1000)} km에서 대기권에 들어갑니다. 절차를 순서대로 수행하세요.`
    : `${visual.name} 착륙 중 — 고도 ${start >= 1000 ? `${Math.round(start / 1000)} km` : `${start} m`}에서 내려앉습니다. 절차를 순서대로 수행하세요.`);
  updateLanding(0);
  syncBar();
}

function landingStartAltitude() {
  return state.landingBody?.landingStartAltitudeM ?? LANDING_START_ALTITUDE;
}

function landingGravity() {
  return state.landingBody?.surfaceGravity ?? targetGravity();
}

function updateLanding(t) {
  state.landingProgress = Math.min(Math.max(t, 0), 1);
  const visual = state.landingBody ?? targetVisual();
  const start = landingStartAltitude();
  const g = landingGravity();
  const penalty = descentPenalty(state.landingSteps);
  const d = descentProfile(state.landingProgress, start, g);
  // 감속 연소를 안 켜면 더 빨리 떨어진다 (D-67). 고도는 그대로 두고 속도만 키운다
  const speed = d.speed * penalty.descentScale;

  state.landing?.setDescent({ ...d, speed, legsOut: penalty.legsOut, reentry: Boolean(visual?.reentry) });
  landingHud?.update({
    bodyName: visual?.name ?? '목적지',
    altitude: d.altitude,
    speed,
    gravity: g,
    remaining: d.duration - d.seconds,
    landed: state.landingProgress >= 1,
  });
  checklist?.update({
    done: state.landingSteps,
    active: activeStep(d.altitude, state.landingSteps),
    missed: missedSteps(d.altitude, state.landingSteps),
    altitude: d.altitude,
  });
  audio.setEngine(state.landingSteps.burn === false ? 0 : d.thrust * 0.8);
}

/** 사용자가 절차 하나를 수행했다 */
function doLandingStep(id) {
  if (state.phase !== 'landing' && state.phase !== 'reentry') return;
  if (state.landingSteps[id]) return;
  state.landingSteps[id] = true;
  audio.thud();
  updateLanding(state.landingProgress);
}

/** 착륙이 끝나면: 편도면 도착, 왕복이면 이륙해서 항행을 이어간다 */
function finishLanding() {
  audio.setEngine(0);
  audio.thud();
  const visual = state.landingBody ?? targetVisual();
  const penalty = descentPenalty(state.landingSteps);
  const touchdown = 1.5 * penalty.descentScale;
  const aim = aimBonus(state.aimSeconds, Math.max(state.cruiseSeconds, 0.001));
  const graded = checklist?.showResult(state.landingSteps, touchdown, aim);
  if (graded) setSubtitle(`${visual?.name ?? '목적지'} 착륙 완료 — 등급 ${graded.grade} (${graded.total}점)`);

  // 지구 재착륙이면 임무 종료
  if (state.phase === 'reentry') { finishCruise(); return; }

  if (state.tripType === TRIP_TYPES.ROUND_TRIP) {
    setSubtitle(`${visual?.name ?? '목적지'}에서 이륙 — 지구로 돌아갑니다.`);
    state.landing?.hide();
    state.landing?.stop();
    landingHud?.setVisible(false);
    checklist?.setVisible(false);
    state.cruise?.show();
    state.cruise?.start();
    cruiseHud?.setVisible(true);
    state.phase = 'cruise';
    state.playing = true;
    setMood('cruise');
    syncBar();
  } else {
    finishCruise();
  }
}

function finishCruise() {
  state.phase = 'arrived';
  state.playing = false;
  stopwatch.setStatus('도착');
  const back = state.tripType === TRIP_TYPES.ROUND_TRIP;
  setSubtitle(back
    ? '지구로 돌아왔습니다. 슬라이더를 끌면 여행의 어느 순간이든 다시 볼 수 있습니다.'
    : '도착했습니다. 슬라이더를 끌면 여행의 어느 순간이든 다시 볼 수 있습니다.');
  setMood('arrived');
  audio.setEngine(0);
  audio.chime();
  syncBar();
}

function resetMission() {
  state.phase = 'ready';
  state.playing = false;
  state.progress = 0;
  state.landingProgress = 0;
  state.visitedTarget = false;
  state.landingSteps = {};
  state.landingBody = null;
  state.aimSeconds = 0;
  state.cruiseSeconds = 0;
  checklist?.setVisible(false);
  state.cruise?.resetAttitude();
  state.cruise?.hide();
  state.cruise?.stop();
  state.landing?.hide();
  state.landing?.stop();
  cruiseHud?.setVisible(false);
  landingHud?.setVisible(false);
  setMood('ready');
  audio.setEngine(0);
  state.launch?.reset();
  state.launch?.setHudVisible(true);
  state.launch?.scene.start();
  stopwatch.setStatus('');
  setSubtitle('발사장과 목적지, 속도를 고르고 발사하세요.');
  setProgress(0);
  syncBar();
}

/** 항행 진행률을 시간에 따라 밀어 주는 시계 */
function startTicker() {
  if (cruiseTicker) return;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 1000, 0.5);
    last = now;
    if (state.phase === 'landing' || state.phase === 'reentry') {
      // 착륙 연출은 임무 시계를 멈추고 따로 진행한다
      // 착륙은 절차를 직접 수행해야 하므로 배속을 2배까지만 적용한다 (D-67)
      const landingScale = Math.min(Math.max(state.timeScale, 0.5), 2);
      const next = state.landingProgress + (dt * landingScale) / LANDING_SECONDS;
      if (next >= 1) { updateLanding(1); finishLanding(); } else { updateLanding(next); }
    } else if (state.playing && state.phase === 'cruise' && state.result) {
      const durationSec = travelDurationSeconds(state.destination?.distance ?? 0,
        state.tripType === TRIP_TYPES.ROUND_TRIP);
      const next = state.progress + (dt * state.timeScale) / durationSec;
      const roundTrip = state.tripType === TRIP_TYPES.ROUND_TRIP;
      const turnAt = roundTrip ? 0.5 : 1;
      if (!state.visitedTarget && next >= turnAt) {
        setProgress(turnAt);
        reachTarget();
      } else if (next >= 1) {
        setProgress(1);
        // 왕복이면 지구에 다시 내려앉는다 (D-66)
        if (roundTrip && state.landing) startReentry(); else finishCruise();
      } else {
        setProgress(next);
      }
      // 조준 유지 보너스 (D-68): 1인칭에서 목적지를 조준선 안에 두고 있으면 시간을 쌓는다
      state.cruiseSeconds += dt;
      if (state.view === 'first' && state.cruise?.onTarget) state.aimSeconds += dt;
    }
    // 조종석 계기판 갱신
    if (state.view === 'first' && state.cruise && state.phase === 'cruise' && state.result) {
      const j = currentJourney();
      state.cruise.setCockpitReadout({
        target: state.destination?.name ?? '-',
        speedText: `${formatNumber((state.speed ?? 0) / 1000, 0)} km/s`,
        remainText: formatDistance(j.toTarget),
        gammaText: formatNumber(gamma(state.speed ?? 0), 3),
      });
    }
    cruiseTicker = requestAnimationFrame(tick);
  };
  cruiseTicker = requestAnimationFrame(tick);
}

// ---- 입력 구성 요소 ----
createDepartureAgeInput(el('departure-age-container'), (ages) => {
  state.departureAges = ages;
  renderLifespan();
});

const launchSiteMap = createLaunchSiteMap(el('launch-site-map'));

createLaunchSiteSelector(el('launch-site-selector'), (site) => {
  state.launchSite = site;
  launchSiteMap.update(site);
  state.launch?.scene.setLaunchSite(site);   // 18단계 (D-69): 발사장 좌표에 맞춰 지구를 돌린다
});

createDestinationSelector(el('destination-selector'), (destination) => {
  state.destination = destination;
  recompute();
});

const lorentzDisplay = createLorentzDisplay(el('lorentz-container'));

const lorentzChart = createLorentzChart(el('lorentz-chart-container'));

const speedSlider = createSpeedSlider(el('speed-slider-container'), (speed) => {
  state.speed = speed;
  lorentzDisplay.update(speed);
  lorentzChart.update(speed);          // 18단계 (R-4): 곡선 위의 점이 같이 움직인다
  recompute();
});

createSpeedPresets(el('speed-presets-container'), (speed) => speedSlider.setSpeed(speed));

createTripTypeSelector(el('trip-type-container'), (tripType) => {
  state.tripType = tripType;
  recompute();
});

// ---- 제어 패널 접기 ----
el('panel-toggle').addEventListener('click', () => {
  document.querySelector('.app').classList.toggle('panel-hidden');
  window.dispatchEvent(new Event('resize'));
});

// ---- 3D 장면 (Three.js는 launch/ 안에서만 불러온다. 동적 import로 실패해도 계산기는 동작한다) ----
Promise.all([
  import('./launch/launchController.js'),
  import('./launch/cruiseScene.js'),
  import('./launch/cruiseHud.js'),
  import('./launch/landingScene.js'),
  import('./launch/landingHud.js'),
  import('./data/falconHeavy.js'),
])
  .then(([{ createLaunchController }, { createCruiseScene }, { createCruiseHud },
          { createLandingScene }, { createLandingHud }, { FALCON_HEAVY }]) => {
    state.rocketSpec = FALCON_HEAVY;   // 16단계에서 설계 로켓 JSON으로 바뀐다
    state.launch = createLaunchController(el('launch-scene'), el('launch-hud'), state.rocketSpec, {
      onComplete: () => enterCruise(),
    });
    state.cruise = createCruiseScene(el('cruise-scene'));
    cruiseHud = createCruiseHud(el('cruise-hud'));
    state.landing = createLandingScene(el('landing-scene'));
    landingHud = createLandingHud(el('cruise-hud'));
    checklist = createLandingChecklist(el('cruise-hud'), {
      onStep: (id) => doLandingStep(id),
      onAuto: () => { for (const s2 of LANDING_STEPS) state.landingSteps[s2.id] = true; updateLanding(state.landingProgress); },
    });
    // 18단계 (D-64): 발사 구간은 기본 5배속으로 돌려 지루하지 않게 한다
    state.timeScale = 5;
    state.launch.timeline.setTimeScale(5);
    if (state.launchSite) state.launch.scene.setLaunchSite(state.launchSite);
    refreshChapters();
    setView(state.view);
    if (state.destination) {
      state.cruise.setBodies(CELESTIAL_BODIES.earth, getBodyVisual(state.destination.id));
    }
    startTicker();
    setProgress(0);
    syncBar();
  })
  .catch((error) => {
    setSubtitle(`3D 장면을 불러오지 못했습니다: ${error.message}`);
    console.error('3D 장면 오류', error);
  });

// 개발 중 확인용: 브라우저 콘솔에서 window.__state 로 현재 상태를 볼 수 있다
window.__state = state;
window.__mission = {
  setProgress, enterCruise, finishCruise, resetMission, reachTarget, updateLanding,
  finishLanding, setView, playChapter, startReentry, doLandingStep,
};
