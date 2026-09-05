// 스톱워치 (6단계, D-31, D-32 / 15단계에서 임무 시계에 연결)
// 역할: 지구 시간과 우주선 시간 두 개의 시계를 보여준다.
// - 15단계부터는 스스로 애니메이션하지 않는다. main.js의 임무 시계가 매 프레임 값을 넣어 준다.
//   그래서 3D 장면·막대 그래프·생존 표와 같은 시각을 가리킨다 (D-55).
// - 두 시계는 같은 진행률에서 각자의 값을 보여주므로, 우주선 시계가 느린 것이 눈에 보인다.
// - 표시 단위: 년 / 일 / 시 / 분 / 초. 100만 년 이상은 만·억·조 년 (D-32)
// - 재생 길이 규칙(3~15초)은 physics/journey.js의 animationDurationMs로 옮겼다.

import { splitDuration, formatYears, formatSubSecond } from '../utils/formatTime.js';
import { formatNumber } from '../utils/units.js';
import { SECONDS_PER_YEAR } from '../data/constants.js';

const LARGE_YEAR_THRESHOLD = 1_000_000;

/**
 * 스톱워치 한 칸의 표시 문자열. 항상 다섯 자리(년 일 시 분 초)를 보여준다.
 * 100만 년 이상은 년 자리만 축약 표기하고 나머지는 생략한다.
 * @param {number} totalSeconds
 */
export function formatStopwatch(totalSeconds) {
  const years = totalSeconds / SECONDS_PER_YEAR;
  if (years >= LARGE_YEAR_THRESHOLD) {
    return formatYears(years);
  }
  const p = splitDuration(totalSeconds);
  const sec = totalSeconds < 60 && totalSeconds > 0 && p.seconds < 1
    ? formatSubSecond(p.seconds)
    : `${Math.floor(p.seconds)}초`;
  return `${formatNumber(p.years, 0)}년 ${p.days}일 ${p.hours}시 ${p.minutes}분 ${sec}`;
}

function createClock(title) {
  const box = document.createElement('div');
  box.className = 'stopwatch';
  const heading = document.createElement('div');
  heading.className = 'stopwatch-title';
  heading.textContent = title;
  const display = document.createElement('div');
  display.className = 'stopwatch-display';
  display.textContent = formatStopwatch(0);
  box.appendChild(heading);
  box.appendChild(display);
  return { box, display };
}

/**
 * @param {HTMLElement} container
 * @returns {{ setTimes: (earthSeconds: number, shipSeconds: number) => void, setStatus: (text: string) => void }}
 */
export function createStopwatch(container) {
  const row = document.createElement('div');
  row.className = 'stopwatch-row';
  const earth = createClock('지구에서 흐른 시간');
  const ship = createClock('우주선에서 흐른 시간');
  row.appendChild(earth.box);
  row.appendChild(ship.box);

  const status = document.createElement('div');
  status.className = 'stopwatch-status';
  status.id = 'stopwatch-status';

  container.appendChild(row);
  container.appendChild(status);

  /**
   * 임무 시계가 준 값을 그대로 보여준다.
   * @param {number} earthSeconds
   * @param {number} shipSeconds
   */
  function setTimes(earthSeconds, shipSeconds) {
    earth.display.textContent = formatStopwatch(Math.max(earthSeconds, 0));
    ship.display.textContent = formatStopwatch(Math.max(shipSeconds, 0));
  }

  function setStatus(text) {
    status.textContent = text;
  }

  setTimes(0, 0);

  return { setTimes, setStatus };
}
