// 스톱워치 애니메이션 (6단계, D-31, D-32)
// 역할: 지구 시간과 우주선 시간 두 개의 스톱워치가 0에서 결과값까지 올라간다.
// - 자동 시작 (발사 장면이 생기면 15단계에서 그 뒤로 옮긴다)
// - 결과가 길수록 오래: 3초 ~ 15초. 배분은 지구 시간의 자릿수(로그)에 비례 (D-31 비고)
// - 두 스톱워치는 같은 시간 동안 움직이고 각자의 결과값에서 멈춘다.
//   그래서 우주선 시계가 지구 시계보다 느리게 가는 것이 눈에 보인다.
// - 표시 단위: 년 / 일 / 시 / 분 / 초. 100만 년 이상은 만·억·조 년 (D-32)

import { splitDuration, formatYears, formatSubSecond } from '../utils/formatTime.js';
import { formatNumber } from '../utils/units.js';
import { SECONDS_PER_YEAR } from '../data/constants.js';

const MIN_DURATION_MS = 3_000;
const MAX_DURATION_MS = 15_000;
// 로그 배분의 기준: 1초(log10 = 0) → 3초, 10¹⁹초(우주 나이의 수십 배, log10 = 19) → 15초
const LOG_MIN = 0;
const LOG_MAX = 19;
const LARGE_YEAR_THRESHOLD = 1_000_000;

/**
 * 결과 시간(초)에 따라 애니메이션 길이(ms)를 정한다.
 * @param {number} totalSeconds
 */
export function animationDurationMs(totalSeconds) {
  const log = Math.log10(Math.max(totalSeconds, 1));
  const t = Math.min(Math.max((log - LOG_MIN) / (LOG_MAX - LOG_MIN), 0), 1);
  return MIN_DURATION_MS + t * (MAX_DURATION_MS - MIN_DURATION_MS);
}

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
 * @returns {{ start: (result: object) => void, stop: () => void }}
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

  let frameId = null;

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  /**
   * 결과값까지 올라가는 애니메이션을 (다시) 시작한다.
   * @param {{ earthTime: number, shipTime: number }} result  초 단위
   */
  function start(result) {
    stop();
    const durationMs = animationDurationMs(result.earthTime);
    const startedAt = performance.now();
    status.textContent = `시간 흐르는 중… (${formatNumber(durationMs / 1000, 0)}초 동안 재생)`;

    function frame(now) {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      earth.display.textContent = formatStopwatch(result.earthTime * progress);
      ship.display.textContent = formatStopwatch(result.shipTime * progress);
      if (progress < 1) {
        frameId = requestAnimationFrame(frame);
      } else {
        frameId = null;
        status.textContent = '도착';
      }
    }
    frameId = requestAnimationFrame(frame);
  }

  return { start, stop };
}
