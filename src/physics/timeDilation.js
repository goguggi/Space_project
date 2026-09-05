// 등속 비행 모델의 시간 지연 계산 (4단계)
// 공식과 근거: docs/03_physics.md 2절, 3.1절
// 화면(DOM)을 다루지 않는다.
//
// 입력 단위: 거리 m, 속도 m/s
// 출력 단위: 초

import { gamma, oneMinusInverseGamma } from './lorentz.js';

/**
 * 여행 형태. 왕복은 편도의 2배 (D-04, 방향 전환 시간 0)
 */
export const TRIP_TYPES = {
  ONE_WAY: 'one-way',
  ROUND_TRIP: 'round-trip',
};

/**
 * 등속 모델로 시간 지연을 계산한다.
 * @param {object} input
 * @param {number} input.distance   편도 거리 (m)
 * @param {number} input.speed      우주선 속도 (m/s), 0 < speed < c
 * @param {string} [input.tripType] TRIP_TYPES 값. 기본 편도
 * @returns {{
 *   earthTime: number,      지구 기준 경과 시간 (s)
 *   shipTime: number,       우주선 기준 경과 시간 (s)
 *   difference: number,     지구 시간 − 우주선 시간 (s), 정밀 계산
 *   gamma: number,          로런츠 인자
 *   totalDistance: number,  실제 이동 거리 (m). 왕복이면 2배
 * }}
 */
export function computeTimeDilation({ distance, speed, tripType = TRIP_TYPES.ONE_WAY }) {
  if (!(distance > 0)) throw new Error('거리는 0보다 커야 합니다');
  if (!(speed > 0)) throw new Error('속도는 0보다 커야 합니다');

  const legs = tripType === TRIP_TYPES.ROUND_TRIP ? 2 : 1;
  const totalDistance = distance * legs;

  const g = gamma(speed);
  const earthTime = totalDistance / speed;          // t_지구 = d / v
  const shipTime = earthTime / g;                   // τ = t_지구 / γ
  const difference = earthTime * oneMinusInverseGamma(speed);   // Δt = t_지구 × (1 − 1/γ), 정밀

  return { earthTime, shipTime, difference, gamma: g, totalDistance };
}
