// 로런츠 인자 계산 (3단계)
// 공식과 근거: docs/03_physics.md 2.1절, 3.1절
// 이 파일은 화면(DOM)을 다루지 않는다. 숫자를 받아 숫자를 돌려준다.
//
// 입력 단위: 속도 v는 m/s
// 출력: 무차원

import { SPEED_OF_LIGHT } from '../data/constants.js';

// 이 값보다 β가 작으면 테일러 급수를 쓴다 (유효숫자 손실 방지, P-02)
const SERIES_THRESHOLD = 1e-3;

/**
 * β = v / c
 * @param {number} speed  m/s
 */
export function beta(speed) {
  return speed / SPEED_OF_LIGHT;
}

/**
 * γ − 1 을 정밀하게 계산한다.
 * β가 작으면 급수 β²/2 + 3β⁴/8 + 5β⁶/16, 아니면 직접 계산.
 * @param {number} speed  m/s
 */
export function gammaMinusOne(speed) {
  const b = beta(speed);
  const b2 = b * b;
  if (b < SERIES_THRESHOLD) {
    return b2 / 2 + (3 * b2 * b2) / 8 + (5 * b2 * b2 * b2) / 16;
  }
  return 1 / Math.sqrt(1 - b2) - 1;
}

/**
 * 로런츠 인자 γ = 1 / √(1 − β²)
 * @param {number} speed  m/s
 */
export function gamma(speed) {
  return 1 + gammaMinusOne(speed);
}

/**
 * 1 − 1/γ = 1 − √(1 − β²) 를 정밀하게 계산한다.
 * 시간 차이 Δt = t_지구 × (1 − 1/γ) 에 쓴다 (docs/03_physics.md 3.1절).
 * β가 작으면 급수 β²/2 + β⁴/8 + β⁶/16, 아니면 직접 계산.
 * @param {number} speed  m/s
 */
export function oneMinusInverseGamma(speed) {
  const b = beta(speed);
  const b2 = b * b;
  if (b < SERIES_THRESHOLD) {
    return b2 / 2 + (b2 * b2) / 8 + (b2 * b2 * b2) / 16;
  }
  return 1 - Math.sqrt(1 - b2);
}
