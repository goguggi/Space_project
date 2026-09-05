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
// 진행률(progress)은 항행 구간의 0~1이다. 재생 길이는 physics/journey.js의 animationDurationMs(3~15초).

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
import { computeTimeDilation, TRIP_TYPES } from './physics/timeDilation.js';
import { judgeAll } from './physics/survival.js';
import { journeyAt, animationDurationMs, beta as toBeta } from './physics/journey.js';
import { gamma } from './physics/lorentz.js';
import { ORGANISMS } from './data/organisms.js';
import { getBodyVisual, CELESTIAL_BODIES } from './data/celestialBodies.js';

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
};

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
    if (state.phase === 'ready' || state.phase === 'launch') enterCruise({ silent: true });
    state.playing = false;
    setProgress(p);
    syncBar();
  },
  onTimeScale: (n) => { state.timeScale = n; state.launch?.timeline.setTimeScale(Math.max(1, Math.round(n))); syncBar(); },
  onSkip: () => {
    if (state.phase === 'launch') { state.launch?.skip(); return; }
    if (state.phase === 'cruise') { state.playing = false; setProgress(1); finishCruise(); }
  },
});

function syncBar() {
  missionBar.update({
    phase: state.phase,
    progress: state.progress,
    playing: state.playing,
    timeScale: state.timeScale,
    ready: Boolean(state.launch && state.result),
  });
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
  state.launch.launch();
  setSubtitle('발사 진행 중 — 부스터 분리와 재착륙을 보조 화면에서 볼 수 있습니다.');
  syncBar();
}

let cruiseHud = null;
let cruiseTicker = null;

/** 발사가 끝나면 항행 화면으로 넘어간다 */
function enterCruise({ silent = false } = {}) {
  if (!state.cruise) return;
  state.phase = 'cruise';
  state.launch?.scene.stop();
  state.launch?.setHudVisible(false);
  state.cruise.show();
  state.cruise.start();
  cruiseHud?.setVisible(true);
  if (!silent) {
    state.playing = true;
    state.progress = 0;
  }
  setSubtitle(`${state.destination?.name ?? '목적지'}(으)로 항행 중 — 아래 슬라이더를 끌면 원하는 시점을 볼 수 있습니다.`);
  stopwatch.setStatus('시간 흐르는 중…');
  setProgress(state.progress);
  syncBar();
}

function finishCruise() {
  state.phase = 'arrived';
  state.playing = false;
  stopwatch.setStatus('도착');
  setSubtitle('도착했습니다. 슬라이더를 끌면 여행의 어느 순간이든 다시 볼 수 있습니다.');
  syncBar();
}

function resetMission() {
  state.phase = 'ready';
  state.playing = false;
  state.progress = 0;
  state.cruise?.hide();
  state.cruise?.stop();
  cruiseHud?.setVisible(false);
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
    if (state.playing && state.phase === 'cruise' && state.result) {
      const durationSec = animationDurationMs(state.result.earthTime) / 1000;
      const next = state.progress + (dt * state.timeScale) / durationSec;
      if (next >= 1) { setProgress(1); finishCruise(); } else { setProgress(next); }
      missionBar.update({
        phase: state.phase, progress: state.progress, playing: state.playing,
        timeScale: state.timeScale, ready: true,
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

createLaunchSiteSelector(el('launch-site-selector'), (site) => {
  state.launchSite = site;
});

createDestinationSelector(el('destination-selector'), (destination) => {
  state.destination = destination;
  recompute();
});

const lorentzDisplay = createLorentzDisplay(el('lorentz-container'));

const speedSlider = createSpeedSlider(el('speed-slider-container'), (speed) => {
  state.speed = speed;
  lorentzDisplay.update(speed);
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
  import('./data/falconHeavy.js'),
])
  .then(([{ createLaunchController }, { createCruiseScene }, { createCruiseHud }, { FALCON_HEAVY }]) => {
    state.rocketSpec = FALCON_HEAVY;   // 16단계에서 설계 로켓 JSON으로 바뀐다
    state.launch = createLaunchController(el('launch-scene'), el('launch-hud'), state.rocketSpec, {
      onComplete: () => enterCruise(),
    });
    state.cruise = createCruiseScene(el('cruise-scene'));
    cruiseHud = createCruiseHud(el('cruise-hud'));
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
window.__mission = { setProgress, enterCruise, finishCruise, resetMission };
