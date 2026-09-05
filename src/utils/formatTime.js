// 시간(초) 서식 (5단계)
// 초 단위 값을 년/일/시/분/초로 나누고, 매우 크거나 작은 값은 읽기 좋은 단위로 바꾼다.
// 1년 = 365.25일 (율리우스년, P-03)

import { SECONDS_PER_YEAR } from '../data/constants.js';
import { formatNumber } from './units.js';

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_MINUTE = 60;

// 큰 년 수를 줄이는 기준. 100만 년 이상은 "만 년", "억 년", "조 년" 단위로 (D-32)
const LARGE_YEAR_THRESHOLD = 1_000_000;

/**
 * 초를 년/일/시/분/초 성분으로 나눈다. 초 성분은 실수일 수 있다.
 * @param {number} totalSeconds
 * @returns {{ years: number, days: number, hours: number, minutes: number, seconds: number }}
 */
export function splitDuration(totalSeconds) {
  let rest = Math.max(0, totalSeconds);
  const years = Math.floor(rest / SECONDS_PER_YEAR);
  rest -= years * SECONDS_PER_YEAR;
  const days = Math.floor(rest / SECONDS_PER_DAY);
  rest -= days * SECONDS_PER_DAY;
  const hours = Math.floor(rest / SECONDS_PER_HOUR);
  rest -= hours * SECONDS_PER_HOUR;
  const minutes = Math.floor(rest / SECONDS_PER_MINUTE);
  rest -= minutes * SECONDS_PER_MINUTE;
  return { years, days, hours, minutes, seconds: rest };
}

/**
 * 년 수를 "2.6만 년", "3.5억 년", "1.2조 년" 형태로 줄인다. 100만 년 미만이면 그대로 천 단위 구분.
 * @param {number} years
 */
export function formatYears(years) {
  if (years >= 1e12) return `${formatNumber(years / 1e12, 2)}조 년`;
  if (years >= 1e8) return `${formatNumber(years / 1e8, 2)}억 년`;
  if (years >= LARGE_YEAR_THRESHOLD) return `${formatNumber(years / 1e4, 1)}만 년`;
  return `${formatNumber(years, 0)}년`;
}

/**
 * 1초보다 짧은 시간을 밀리초/마이크로초/나노초로 서식한다.
 * @param {number} seconds
 */
export function formatSubSecond(seconds) {
  if (seconds >= 1e-3) return `${formatNumber(seconds * 1e3, 2)} 밀리초`;
  if (seconds >= 1e-6) return `${formatNumber(seconds * 1e6, 2)} 마이크로초`;
  if (seconds >= 1e-9) return `${formatNumber(seconds * 1e9, 2)} 나노초`;
  if (seconds > 0) return `${seconds.toExponential(2)} 초`;
  return '0초';
}

/**
 * 초를 "4년 105일 12시간 3분 20초" 형태의 전체 문자열로 만든다.
 * - 100만 년 이상: "253만 년" 처럼 년만 표시
 * - 1초 미만: 밀리초/마이크로초/나노초
 * - 그 외: 0이 아닌 성분만 이어 붙임. 초는 정수로 반올림
 * @param {number} totalSeconds
 */
export function formatDuration(totalSeconds) {
  if (totalSeconds < 1) return formatSubSecond(totalSeconds);

  const parts = splitDuration(totalSeconds);
  if (parts.years >= LARGE_YEAR_THRESHOLD) {
    return formatYears(totalSeconds / SECONDS_PER_YEAR);
  }

  const pieces = [];
  if (parts.years > 0) pieces.push(`${formatNumber(parts.years, 0)}년`);
  if (parts.days > 0) pieces.push(`${parts.days}일`);
  if (parts.hours > 0) pieces.push(`${parts.hours}시간`);
  if (parts.minutes > 0) pieces.push(`${parts.minutes}분`);
  const roundedSeconds = Math.round(parts.seconds);
  if (roundedSeconds > 0 || pieces.length === 0) pieces.push(`${roundedSeconds}초`);
  return pieces.join(' ');
}

/**
 * 초를 가장 알맞은 단위 하나로 요약한다. 예: "≈ 4.29년", "≈ 9.53시간", "≈ 24.0 마이크로초"
 * 표 옆에 보조 설명으로 쓴다.
 * @param {number} totalSeconds
 */
export function formatDurationApprox(totalSeconds) {
  if (totalSeconds < 1) return `≈ ${formatSubSecond(totalSeconds)}`;
  const years = totalSeconds / SECONDS_PER_YEAR;
  if (years >= LARGE_YEAR_THRESHOLD) return `≈ ${formatYears(years)}`;
  if (years >= 1) return `≈ ${formatNumber(years, 2)}년`;
  const days = totalSeconds / SECONDS_PER_DAY;
  if (days >= 1) return `≈ ${formatNumber(days, 1)}일`;
  const hours = totalSeconds / SECONDS_PER_HOUR;
  if (hours >= 1) return `≈ ${formatNumber(hours, 2)}시간`;
  const minutes = totalSeconds / SECONDS_PER_MINUTE;
  if (minutes >= 1) return `≈ ${formatNumber(minutes, 1)}분`;
  return `≈ ${formatNumber(totalSeconds, 1)}초`;
}
