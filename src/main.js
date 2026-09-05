// 프로그램 진입점
// 역할: 각 화면 구성 요소를 만들고 서로 연결한다. 계산이나 그리기는 직접 하지 않는다.
// 단계가 추가될 때마다 여기에 구성 요소 생성 코드가 한 줄씩 늘어난다.

import { createLaunchSiteSelector } from './ui/launchSiteSelector.js';
import { createDestinationSelector } from './ui/destinationSelector.js';
import { createSpeedSlider } from './ui/speedSlider.js';
import { createSpeedPresets } from './ui/speedPresets.js';
import { createLorentzDisplay } from './ui/lorentzDisplay.js';
import { createTripTypeSelector } from './ui/tripTypeSelector.js';
import { computeTimeDilation } from './physics/timeDilation.js';

// 사용자의 현재 선택을 한곳에 모아 둔다. 뒤 단계의 구성 요소들이 이 값을 읽는다.
const state = {
  launchSite: null,    // 1단계: 선택된 발사장 객체
  destination: null,   // 2단계: 선택된 천체 객체 (distance는 m)
  speed: null,         // 3단계: 우주선 속도 (m/s)
  tripType: null,      // 4단계: 편도 / 왕복
  result: null,        // 4단계: computeTimeDilation 결과 (초 단위)
};

// 입력이 바뀔 때마다 시간 지연을 다시 계산한다. 결과 표시는 5단계부터 붙는다.
function recompute() {
  if (!state.destination || !state.speed || !state.tripType) return;
  state.result = computeTimeDilation({
    distance: state.destination.distance,
    speed: state.speed,
    tripType: state.tripType,
  });
  // 5단계(수치 표), 6단계(스톱워치), 7단계(생물 비교)가 여기서 state.result를 받아 그린다
}

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
