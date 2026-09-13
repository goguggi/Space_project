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
import { createArrivalCard } from './ui/arrivalCard.js';
import { createLaunchSiteMap } from './ui/launchSiteMap.js';
import { createSpaceAudio } from './audio/spaceAudio.js';
import { createLorentzChart } from './ui/lorentzChart.js';
import { createMissionChapters } from './ui/missionChapters.js';
import { createLandingChecklist } from './ui/landingChecklist.js';
import { createAscentChecklist } from './ui/ascentChecklist.js';
import { createEvaPanel } from './ui/evaPanel.js';
import { judgeTouchdown } from './physics/landingMission.js';
import { EXPLORATION_TASKS, walkParameters, taskInReach, nearestTask, explorationScore } from './physics/exploration.js';
import { ASCENT_STEPS, reachedSteps, nextStep, ascentProgress } from './physics/ascentMission.js';
import { missionChapters, currentChapter } from './physics/missionTimeline.js';
import { activeStep, missedSteps, descentPenalty, aimBonus, stepsFor } from './physics/landingMission.js';
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
  // 20단계
  crashed: false,      // 착륙 실패 (D-75)
  evaTasks: {},        // 탐사 임무 id → 수행 여부 (D-77)
  liftoffProgress: 0,  // 목적지 이륙 진행률 (D-80)
  startChapter: 'launch',  // 체크한 시작 지점 (20단계)
};

// 걷기 입력 (20단계). 키를 누르고 있는 동안 유지된다
const walkKeys = new Set();

// 착륙 시작 고도 (m). 실제 하강 유도는 훨씬 높은 곳에서 시작하지만, 화면에서는 마지막 구간만 보여준다.
// 지구는 대기가 있어 재진입부터 보여주므로 celestialBodies의 landingStartAltitudeM를 쓴다 (D-66)
const LANDING_START_ALTITUDE = 2_000;
const LANDING_SECONDS = 10;
// 지구 재진입은 80 km에서 시작하므로 더 길게 보여준다 (D-66)
const REENTRY_SECONDS = 18;
// 목적지에서 다시 떠오르는 연출 (20단계, D-80). 착륙의 반대 순서로 올라간다
const LIFTOFF_SECONDS = 8;

const el = (id) => document.getElementById(id);

// ---- 결과를 그리는 구성 요소 (입력 구성 요소보다 먼저 만든다) ----
const resultTable = createResultTable(el('result-table-container'));
const stopwatch = createStopwatch(el('stopwatch-container'));
const lifespanChart = createLifespanChart(el('lifespan-chart-container'));
const survivalIcons = createSurvivalIcons(el('survival-container'));

// ---- 임무 조작 막대 ----
const missionBar = createMissionBar(el('mission-bar-container'), {
  onLaunch: () => {
    // 체크한 시작 지점이 발사가 아니면 그 구간부터 재생한다 (20단계)
    if (state.startChapter && state.startChapter !== 'launch') { playChapter(state.startChapter); return; }
    startLaunch();
  },
  onReset: () => resetMission(),
  onTogglePlay: () => { state.playing = !state.playing; syncBar(); },
  onScrub: (p) => {
    // 슬라이더를 끌면 바로 그 시점으로. 아직 발사 전이라도 항행 화면으로 넘어간다
    if (state.phase !== 'cruise' && state.phase !== 'arrived') enterCruise({ silent: true });
    state.playing = false;
    const turnAt = state.tripType === TRIP_TYPES.ROUND_TRIP ? 0.5 : 1;
    state.visitedTarget = p >= turnAt;   // 반환점을 지난 지점으로 끌면 이미 다녀온 것으로 본다
    setProgress(p);
    if (p >= 1) {
      if (state.tripType === TRIP_TYPES.ROUND_TRIP && state.landing) startReentry();
      else finishCruise();
    } else if (state.phase === 'arrived') { state.phase = 'cruise'; }
    syncBar();
  },
  onTimeScale: (n) => { state.timeScale = n; state.launch?.timeline.setTimeScale(Math.max(1, Math.round(n))); syncBar(); },
  onSkip: () => {
    if (state.phase === 'launch') { state.launch?.skip(); return; }
    if (state.phase === 'liftoff') {
      syncBar();
      const next = state.liftoffProgress + (dt * Math.min(Math.max(state.timeScale, 0.5), 3)) / LIFTOFF_SECONDS;
      if (next >= 1) { updateLiftoff(1); finishLiftoff(); } else { updateLiftoff(next); }
    } else if (state.phase === 'landing' || state.phase === 'reentry') { updateLanding(1); finishLanding(); return; }
    if (state.phase === 'cruise') {
      const roundTrip = state.tripType === TRIP_TYPES.ROUND_TRIP;
      if (!state.visitedTarget) { setProgress(roundTrip ? 0.5 : 1); reachTarget(); return; }
      state.playing = false; setProgress(1); finishCruise();
    }
  },
});

// ---- 도착 요약 카드 (21단계, D-93) ----
// 여행이 끝나면 화면 가운데에 결과를 띄운다. 예전에는 자막 한 줄뿐이라 "아무것도 없는" 화면이었다.
const arrivalCard = createArrivalCard(el('stage'), {
  onReset: () => resetMission(),
  onReplay: () => {
    arrivalCard.hide();
    state.playing = false;
    setProgress(0);
    state.phase = 'cruise';
    state.playing = true;
    syncBar();
  },
});

// ---- 소리 (17단계, D-59) ----
const audio = createSpaceAudio();

// ---- 시점 전환 버튼 (17단계, D-58) ----
const viewControls = createViewControls(el('view-controls'), {
  onView: (id) => setView(id),
  onSound: (on) => audio.setEnabled(on),
  // 21단계(D-89): 가지고 있는 음원을 배경 음악으로 쓴다 (브라우저 안에서만 재생)
  onMusicFile: async (file) => {
    if (!file) { audio.clearCustomTrack(); viewControls.setMusicName(''); return; }
    await audio.resume();
    const ok = await audio.useCustomTrack(file);
    viewControls.setMusicName(ok ? file.name : '');
    if (ok) { viewControls.setSound(true); setSubtitle(`배경 음악을 "${file.name}"으로 바꿨습니다.`); }
  },
});

function setView(id) {
  state.view = id;
  viewControls.setView(id);
  state.launch?.setCameraMode(id);
  state.cruise?.setCameraMode(id);
  state.landing?.setCameraMode(id);
}

function setMood(name) { audio.setMood(name); }

/** 상승 이정표를 눌렀을 때: 아직 오지 않은 지점이면 거기까지 즉시 전진한다 (D-73) */
function jumpToAscentStep(id) {
  if (!state.launch) return;
  const step = ASCENT_STEPS.find((s2) => s2.id === id);
  if (!step) return;
  if (state.phase === 'ready') startLaunch();
  if (state.phase !== 'launch') return;
  audio.thud();
  state.launch.advanceUntil(step.reached);
  refreshAscent();
}

function refreshAscent() {
  if (!ascentList || !state.launch) return;
  const sim = state.launch.timeline.sim;
  ascentList.update({ done: reachedSteps(sim), next: nextStep(sim) });
}

// ---- 임무 구간 칩 (18단계, D-65) ----
const chapters = createMissionChapters(el('mission-chapters'), {
  onSelect: (id) => playChapter(id),
  onPick: (id) => {
    // 체크한 구간이 "시작 지점"이 된다. 발사 버튼을 누르면 무조건 여기서 출발한다 (20단계)
    state.startChapter = id;
    const chapter = state.chapters.find((c) => c.id === id);
    setSubtitle(`시작 지점: ${chapter?.label ?? id} — 발사 버튼을 누르면 여기서 출발합니다.`);
    syncBar();
  },
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

/**
 * 지금 단계에 맞는 진행 막대 값과 양 끝 이름 (20단계 수정).
 * 착륙·탐사·이륙 중에 항행 진행률(예: 100%)을 그대로 보여주면 "이미 도착"처럼 보인다.
 */
function barState() {
  switch (state.phase) {
    case 'launch':
      return { value: state.launch ? ascentProgress(state.launch.timeline.sim) : 0, from: '발사대', to: '궤도' };
    case 'landing':
      return { value: state.landingProgress, from: '상공', to: '접지' };
    case 'reentry':
      return { value: state.landingProgress, from: '대기권', to: '착륙' };
    case 'crashed':
      return { value: 1, from: '상공', to: '파손' };
    case 'eva':
      return { value: explorationScore(state.evaTasks).doneCount / explorationScore(state.evaTasks).total,
        from: '탐사 시작', to: '임무 완료' };
    case 'liftoff':
      return { value: state.liftoffProgress, from: '지표', to: '궤도' };
    default:
      return { value: state.progress, from: '출발', to: '도착' };
  }
}

function syncBar() {
  const bar = barState();
  missionBar.update({
    phase: state.phase,
    progress: bar.value,
    fromLabel: bar.from,
    toLabel: bar.to,
    playing: state.playing,
    timeScale: state.timeScale,
    ready: Boolean(state.launch && state.result),
    startLabel: state.chapters.find((c) => c.id === state.startChapter)?.label,
    startsAtLaunch: !state.startChapter || state.startChapter === 'launch',
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
  if (state.phase !== 'arrived') arrivalCard.hide();
  state.progress = Math.min(Math.max(p, 0), 1);
  if (!state.result || !state.destination) return;
  const j = currentJourney();
  const b = toBeta(state.speed ?? 0);

  stopwatch.setTimes(j.earthElapsed, j.shipElapsed);
  // 음악도 시간 지연을 따라 늘어진다 (21단계): γ가 클수록 초침과 음형이 느려진다
  audio.setTimeDilation(gamma(state.speed ?? 0));
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
  audio.setTimeDilation(1);   // 발사 중에는 시간 지연이 없다 (음악도 제 빠르기)
  audio.boom();
  audio.setEngine(1);
  ascentList?.setVisible(true);
  setSubtitle('발사 진행 중 — 왼쪽 상승 절차를 누르면 그 지점까지 건너뜁니다. 오른쪽 버튼 드래그로 시점을 돌리세요.');
  syncBar();
}

let cruiseHud = null;
let landingHud = null;
let checklist = null;
let ascentList = null;
let evaPanel = null;
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
  ascentList?.setVisible(false);
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
  checklist?.setSteps(stepsFor(visual));
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
    active: activeStep(d.altitude, state.landingSteps, stepsFor(visual)),
    missed: missedSteps(d.altitude, state.landingSteps, stepsFor(visual)),
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
  const visual = state.landingBody ?? targetVisual();
  const penalty = descentPenalty(state.landingSteps);
  const touchdown = 1.5 * penalty.descentScale;
  const outcome = judgeTouchdown(touchdown, penalty.legsOut);

  // ---- 착륙 실패: 폭발 (20단계, D-75) ----
  if (outcome.crashed) {
    state.crashed = true;
    state.wasReentry = state.phase === 'reentry';
    state.phase = 'crashed';        // 시계를 멈춘다. "다시 시도"로만 빠져나온다
    audio.boom();
    state.landing?.explode(landingGravity());
    checklist?.showCrash(outcome.reason);
    setSubtitle(`${visual?.name ?? '목적지'} 착륙 실패 — ${outcome.reason}`);
    syncBar();
    return;
  }

  audio.thud();
  const aim = aimBonus(state.aimSeconds, Math.max(state.cruiseSeconds, 0.001));
  const graded = checklist?.showResult(state.landingSteps, touchdown, aim);
  if (graded) setSubtitle(`${visual?.name ?? '목적지'} 착륙 성공 — 등급 ${graded.grade} (${graded.total}점). 탐사를 시작합니다.`);

  // 지구 재착륙이면 임무 종료
  if (state.phase === 'reentry') { finishCruise(); return; }

  // 목적지 착륙에 성공했으면 우주인이 내려 탐사한다 (D-77)
  if (state.landing && !visual?.reentry) { startEva(); return; }

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

// ---- 지표 탐사 (20단계, D-77) ----
function startEva() {
  state.phase = 'eva';
  state.evaTasks = {};
  const g = landingGravity();
  state.landing.startEva(EXPLORATION_TASKS, g);
  setView('first');            // 탐사는 우주인 1인칭으로 시작한다 (D-84)
  checklist?.setVisible(false);
  landingHud?.setVisible(false);
  evaPanel?.setVisible(true);
  setMood('arrived');
  setSubtitle(`${state.landingBody?.name ?? '목적지'} 지표 탐사 — 화면을 한 번 누르면 마우스로 몸을 돌립니다. W A S D로 걷고, 파란 원 안에서 E를 누르세요.`);
  refreshEva();
  syncBar();
}

function refreshEva() {
  if (!evaPanel || !state.landing) return;
  const w = state.landing.walker;
  const g = landingGravity();
  evaPanel.update({
    done: state.evaTasks,
    reach: taskInReach(w, state.evaTasks),
    nearest: nearestTask(w, state.evaTasks),
    gravity: g,
    jumpHeight: walkParameters(g).jumpHeight,
  });
}

/** E를 눌렀을 때: 발밑 임무를 수행한다 */
function doEvaTask() {
  if (state.phase !== 'eva' || !state.landing) return;
  const task = taskInReach(state.landing.walker, state.evaTasks);
  if (!task) return;
  state.evaTasks[task.id] = true;
  state.landing.completeTask(task);
  audio.chime();
  const score = explorationScore(state.evaTasks);
  if (task.last || score.complete) {
    evaPanel?.showResult(score, landingGravity(), walkParameters(landingGravity()).jumpHeight);
    setSubtitle(`탐사 완료 — 임무 ${score.doneCount} / ${score.total}. "여행 마치기"를 누르면 다음으로 넘어갑니다.`);
  }
  refreshEva();
}

/**
 * 탐사를 마치고 우주선에 탑승 → 이륙 (20단계, D-80).
 * 편도면 여기서 여행이 끝나고, 왕복이면 실제로 지표에서 떠올라 지구로 향한다.
 */
function finishEva() {
  evaPanel?.setVisible(false);
  startLiftoff();          // 편도든 왕복이든 일단 지표에서 떠오른다
}

/** 목적지 지표에서 이륙한다. 착륙의 반대 순서로 올라간다 */
function startLiftoff() {
  state.landing?.releaseLook();
  if (!state.landing) return;
  state.phase = 'liftoff';
  state.liftoffProgress = 0;
  state.playing = false;
  evaPanel?.setVisible(false);
  checklist?.setVisible(false);
  landingHud?.setVisible(true);
  state.landing.show();
  state.landing.start();
  state.landing.setCameraMode(state.view);
  setMood('launch');
  audio.setTimeDilation(1);   // 발사 중에는 시간 지연이 없다 (음악도 제 빠르기)
  audio.boom();
  audio.setEngine(1);
  setSubtitle(`${state.landingBody?.name ?? '목적지'}에서 이륙 — 우주선에 탑승해 지구로 돌아갑니다.`);
  updateLiftoff(0);
  syncBar();
}

/** 이륙 진행: 고도는 착륙 프로파일을 거꾸로 쓴다 */
function updateLiftoff(t) {
  state.liftoffProgress = Math.min(Math.max(t, 0), 1);
  const start = landingStartAltitude();
  const g = landingGravity();
  // 착륙 프로파일의 시간을 뒤집으면 그대로 상승 곡선이 된다
  const d = descentProfile(1 - state.liftoffProgress, start, g);
  state.landing?.setLiftoff({ altitude: d.altitude, speed: d.speed });
  landingHud?.update({
    bodyName: state.landingBody?.name ?? '목적지',
    altitude: d.altitude,
    speed: d.speed,
    gravity: g,
    remaining: 0,
    landed: false,
    ascending: true,
  });
  audio.setEngine(0.9);
}

/** 이륙이 끝나면 항행(귀환)으로 넘어간다 */
function finishLiftoff() {
  audio.setEngine(0.2);
  state.landing?.hide();
  state.landing?.stop();
  state.landing?.resetScene();
  landingHud?.setVisible(false);
  state.cruise?.show();
  state.cruise?.start();
  state.cruise?.setCameraMode(state.view);
  cruiseHud?.setVisible(true);
  if (state.tripType !== TRIP_TYPES.ROUND_TRIP) {
    // 편도: 목적지 궤도에 오른 것으로 여행이 끝난다
    state.cruise?.hide();
    state.cruise?.stop();
    cruiseHud?.setVisible(false);
    setSubtitle(`${state.landingBody?.name ?? '목적지'} 궤도 진입 — 편도 여행을 마쳤습니다.`);
    finishCruise();
    return;
  }
  state.phase = 'cruise';
  state.visitedTarget = true;
  state.playing = true;
  setMood('cruise');
  setSubtitle('지구로 귀환 중 — 도착하면 대기권에 다시 들어갑니다.');
  syncBar();
}

/** 착륙에 실패했을 때 다시 시도 */
function retryLanding() {
  state.crashed = false;
  state.landing?.resetScene();
  const visual = state.landingBody ?? targetVisual();
  beginLanding(visual, state.wasReentry ? 'reentry' : 'landing');
}

function finishCruise() {
  state.landing?.releaseLook();
  state.phase = 'arrived';
  state.playing = false;
  stopwatch.setStatus('도착');
  const back = state.tripType === TRIP_TYPES.ROUND_TRIP;
  setSubtitle(back
    ? '지구로 돌아왔습니다. 슬라이더를 끌면 여행의 어느 순간이든 다시 볼 수 있습니다.'
    : '도착했습니다. 슬라이더를 끌면 여행의 어느 순간이든 다시 볼 수 있습니다.');

  // 도착 요약 카드 (21단계, D-93)
  if (state.result) {
    const g = gamma(state.speed ?? 0);
    arrivalCard.show({
      destination: state.destination?.name ?? '목적지',
      roundTrip: back,
      earthSeconds: state.result.earthTime,
      shipSeconds: state.result.shipTime,
      gamma: g,
      note: g > 1.0001
        ? `광속의 ${(toBeta(state.speed ?? 0) * 100).toFixed(2)}%로 날아 로런츠 인자 γ = ${g.toFixed(4)}. 우주선 안에서는 시간이 그만큼 천천히 흘렀습니다.`
        : '이 속도에서는 시간 지연이 거의 없습니다. 속도를 올려 다시 떠나 보세요.',
    });
  }
  setMood('arrived');
  audio.setEngine(0);
  audio.chime();
  syncBar();
}

function resetMission() {
  arrivalCard.hide();
  state.landing?.releaseLook();
  state.phase = 'ready';
  state.playing = false;
  state.progress = 0;
  state.landingProgress = 0;
  state.visitedTarget = false;
  state.landingSteps = {};
  state.landingBody = null;
  state.crashed = false;
  state.evaTasks = {};
  state.liftoffProgress = 0;
  evaPanel?.setVisible(false);
  state.landing?.resetScene();
  state.aimSeconds = 0;
  state.cruiseSeconds = 0;
  checklist?.setVisible(false);
  ascentList?.setVisible(false);
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
    if (state.phase === 'liftoff') {
      syncBar();
      const next = state.liftoffProgress + (dt * Math.min(Math.max(state.timeScale, 0.5), 3)) / LIFTOFF_SECONDS;
      if (next >= 1) { updateLiftoff(1); finishLiftoff(); } else { updateLiftoff(next); }
    } else if (state.phase === 'landing' || state.phase === 'reentry') {
      // 착륙 연출은 임무 시계를 멈추고 따로 진행한다
      // 착륙은 절차를 직접 수행해야 하므로 배속을 2배까지만 적용한다 (D-67)
      const landingScale = Math.min(Math.max(state.timeScale, 0.5), 2);
      const seconds = state.phase === 'reentry' ? REENTRY_SECONDS : LANDING_SECONDS;
      const next = state.landingProgress + (dt * landingScale) / seconds;
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
    if (state.phase === 'launch') { refreshAscent(); syncBar(); }

    // 지표 탐사: 키 입력으로 우주인을 움직인다 (D-77)
    if (state.phase === 'eva' && state.landing) {
      const g = landingGravity();
      state.landing.stepWalk({
        forward: (walkKeys.has('w') ? 1 : 0) - (walkKeys.has('s') ? 1 : 0),
        strafe: (walkKeys.has('a') ? 1 : 0) - (walkKeys.has('d') ? 1 : 0),
        turn: (walkKeys.has('arrowleft') ? 1 : 0) - (walkKeys.has('arrowright') ? 1 : 0),
        jump: walkKeys.has(' '),
        run: walkKeys.has('shift'),
      }, dt, walkParameters(g));
      refreshEva();
      syncBar();
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
    ascentList = createAscentChecklist(el('launch-hud'), { onJump: (id) => jumpToAscentStep(id) });
    evaPanel = createEvaPanel(el('cruise-hud'), { onAct: () => doEvaTask(), onFinish: () => finishEva() });
    checklist = createLandingChecklist(el('cruise-hud'), {
      onStep: (id) => doLandingStep(id),
      onAuto: () => { for (const s2 of stepsFor(state.landingBody)) state.landingSteps[s2.id] = true; updateLanding(state.landingProgress); },
      onRetry: () => retryLanding(),
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
  finishLanding, setView, playChapter, startReentry, doLandingStep, jumpToAscentStep,
  startEva, doEvaTask, finishEva, retryLanding, startLiftoff, finishLiftoff,
};

// ---- 걷기·수행 키 (20단계) ----
window.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  const k = e.key.toLowerCase();
  if (state.phase !== 'eva') return;
  if ([' ', 'w', 'a', 's', 'd', 'shift', 'arrowleft', 'arrowright'].includes(k)) {
    walkKeys.add(k);
    e.preventDefault();
  }
  if (k === 'e') { e.preventDefault(); doEvaTask(); }
});
window.addEventListener('keyup', (e) => walkKeys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => walkKeys.clear());
