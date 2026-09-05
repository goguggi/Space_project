// 프로그램 진입점
// 역할: 각 화면 구성 요소를 만들고 서로 연결한다. 계산이나 그리기는 직접 하지 않는다.
// 단계가 추가될 때마다 여기에 구성 요소 생성 코드가 한 줄씩 늘어난다.

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
import { computeTimeDilation, TRIP_TYPES } from './physics/timeDilation.js';
import { judgeAll } from './physics/survival.js';
import { ORGANISMS } from './data/organisms.js';

// 사용자의 현재 선택을 한곳에 모아 둔다. 뒤 단계의 구성 요소들이 이 값을 읽는다.
const state = {
  launchSite: null,    // 1단계: 선택된 발사장 객체
  destination: null,   // 2단계: 선택된 천체 객체 (distance는 m)
  speed: null,         // 3단계: 우주선 속도 (m/s)
  tripType: null,      // 4단계: 편도 / 왕복
  result: null,        // 4단계: computeTimeDilation 결과 (초 단위)
  departureAges: {},   // 7단계: 생물 id → 출발 나이 (초)
};

// 입력이 바뀔 때마다 시간 지연을 다시 계산한다. 결과 표시는 5단계부터 붙는다.
function recompute() {
  if (!state.destination || !state.speed || !state.tripType) return;
  state.result = computeTimeDilation({
    distance: state.destination.distance,
    speed: state.speed,
    tripType: state.tripType,
  });
  const context = {
    destinationName: state.destination.name,
    tripTypeLabel: state.tripType === TRIP_TYPES.ROUND_TRIP ? '왕복' : '편도',
  };
  // 5단계: 수치 표
  resultTable.update(state.result, context);
  // 6단계: 스톱워치. 입력이 바뀔 때마다 처음부터 다시 올라간다 (발사 장면이 생기면 15단계에서 그 뒤로 옮김)
  stopwatch.start(state.result);
  // 7단계: 생물 비교
  renderLifespan();
}

// 7단계: 출발 나이만 바뀌었을 때는 시간 지연을 다시 계산할 필요가 없으므로 따로 둔다
function renderLifespan() {
  if (!state.result) return;
  lifespanChart.update(state.result, state.departureAges);
  survivalIcons.update(judgeAll(ORGANISMS, state.departureAges, state.result));
}

// 결과를 그리는 구성 요소들은 입력 구성 요소보다 먼저 만들어야 첫 계산 결과를 받을 수 있다
const resultTable = createResultTable(document.getElementById('result-table-container'));
const stopwatch = createStopwatch(document.getElementById('stopwatch-container'));
const lifespanChart = createLifespanChart(document.getElementById('lifespan-chart-container'));
const survivalIcons = createSurvivalIcons(document.getElementById('survival-container'));

// 7단계: 출발 나이 입력. 결과 구성 요소 다음, 입력 구성 요소 앞에 만든다 (첫 알림이 state에 들어가야 함)
createDepartureAgeInput(
  document.getElementById('departure-age-container'),
  (ages) => {
    state.departureAges = ages;
    renderLifespan();
  },
);

// 1단계: 발사장 선택
createLaunchSiteSelector(
  document.getElementById('launch-site-selector'),
  (site) => {
    state.launchSite = site;
  },
);

// 2단계: 목적지 선택
createDestinationSelector(
  document.getElementById('destination-selector'),
  (destination) => {
    state.destination = destination;
    recompute();
  },
);

// 3단계: 속도 슬라이더, 프리셋, 로런츠 인자 표시
// 로런츠 표시는 속도 슬라이더보다 먼저 만들어야 첫 속도 알림을 받을 수 있다.
const lorentzDisplay = createLorentzDisplay(document.getElementById('lorentz-container'));

const speedSlider = createSpeedSlider(
  document.getElementById('speed-slider-container'),
  (speed) => {
    state.speed = speed;
    lorentzDisplay.update(speed);
    recompute();
  },
);

createSpeedPresets(
  document.getElementById('speed-presets-container'),
  (speed) => speedSlider.setSpeed(speed),
);

// 4단계: 편도 / 왕복
createTripTypeSelector(
  document.getElementById('trip-type-container'),
  (tripType) => {
    state.tripType = tripType;
    recompute();
  },
);

// 개발 중 확인용: 브라우저 콘솔에서 window.__state 로 현재 상태를 볼 수 있다
window.__state = state;
