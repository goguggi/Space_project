// 단위 변환 (2단계)
// 내부 저장 단위는 항상 m, m/s 이다. 표시할 때만 km, AU, 광년, 광속 비율로 바꾼다.

import { ASTRONOMICAL_UNIT, LIGHT_YEAR, SPEED_OF_LIGHT } from '../data/constants.js';

// ---- 거리 ----
export const kmToMeters = (km) => km * 1000;
export const metersToKm = (m) => m / 1000;
export const auToMeters = (au) => au * ASTRONOMICAL_UNIT;
export const metersToAu = (m) => m / ASTRONOMICAL_UNIT;
export const lightYearsToMeters = (ly) => ly * LIGHT_YEAR;
export const metersToLightYears = (m) => m / LIGHT_YEAR;

// ---- 속도 ----
export const kmPerSecToMetersPerSec = (kmps) => kmps * 1000;
export const metersPerSecToKmPerSec = (mps) => mps / 1000;
export const fractionOfCToMetersPerSec = (beta) => beta * SPEED_OF_LIGHT;
export const metersPerSecToFractionOfC = (mps) => mps / SPEED_OF_LIGHT;

/**
 * 거리를 사람이 읽기 좋은 단위로 서식한다.
 * 기준: 0.01 AU 미만은 km, 0.1 광년 미만은 AU, 그 이상은 광년
 * @param {number} meters
 * @returns {string} 예: "384,400 km", "5.20 AU", "4.25 광년", "253.7만 광년"
 */
export function formatDistance(meters) {
  const au = metersToAu(meters);
  if (au < 0.01) {
    return `${formatNumber(metersToKm(meters), 0)} km`;
  }
  const ly = metersToLightYears(meters);
  if (ly < 0.1) {
    return `${formatNumber(au, 2)} AU`;
  }
  if (ly >= 10_000) {
    return `${formatNumber(ly / 10_000, 1)}만 광년`;
  }
  if (ly >= 100) {
    return `${formatNumber(ly, 0)} 광년`;
  }
  return `${formatNumber(ly, 2)} 광년`;
}

/**
 * 숫자를 천 단위 구분 기호와 소수 자릿수로 서식한다.
 * @param {number} value
 * @param {number} fractionDigits
 */
export function formatNumber(value, fractionDigits = 0) {
  return value.toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
