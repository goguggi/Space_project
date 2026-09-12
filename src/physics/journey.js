// 항행(우주 여행) 계산 (15단계)
// 역할: "임무 진행률 p (0~1)"를 받아 그 순간의 이동 거리·경과 시간과, 3D 장면이 쓸 겉보기 크기를 계산한다.
// 화면(DOM)도 Three.js도 모르는 순수 함수. 검증은 tests/physics.test.js.
//
// 공식 근거: docs/03_physics.md
//   - 등속 모델이므로 이동 거리와 경과 시간은 진행률에 비례한다 (왕복은 절반에서 되돌아온다).
//   - 겉보기 반지름(각반지름) θ = atan(R / d). 멀리 있으면 작게, 가까우면 크게 보인다.
//   - 상대론적 도플러 (정면): f_관측 / f_원천 = √((1+β)/(1−β)). 앞쪽 별이 파랗게, 뒤쪽 별이 붉게 보인다.
//   - 광행차: cos θ′ = (cos θ + β) / (1 + β·cos θ). 빠를수록 별이 진행 방향 앞쪽으로 몰린다(전조등 효과).
// 단위: m, s, 무차원(β = v/c)

import { SPEED_OF_LIGHT } from '../data/constants.js';

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

// 임무 재생 길이 (ms). 결과가 길수록 오래 재생한다 (D-31 비고).
// 1초(log10 = 0) → 3초, 10¹⁹초 → 15초. 6단계 스톱워치와 같은 규칙을 쓴다.
const MIN_DURATION_MS = 3_000;
const MAX_DURATION_MS = 15_000;
const LOG_MIN = 0;
const LOG_MAX = 19;

/**
 * 결과 시간(초)에 따라 재생 길이(ms)를 정한다. (15단계 규칙, 18단계부터는 아래 거리 기준을 쓴다)
 * @param {number} totalSeconds  지구에서 흐른 시간
 */
export function animationDurationMs(totalSeconds) {
  const log = Math.log10(Math.max(totalSeconds, 1));
  const t = clamp01((log - LOG_MIN) / (LOG_MAX - LOG_MIN));
  return MIN_DURATION_MS + t * (MAX_DURATION_MS - MIN_DURATION_MS);
}

// ---- 18단계 (D-63): 항행 재생 시간은 "거리"로 정한다 ----
// 지구 시간으로 정하면 같은 목적지도 속도에 따라 재생 시간이 달라져 거리 비교가 안 된다.
// 거리의 로그에 비례해 달 5초 ~ 안드로메다 60초 사이로 늘린다. 목적지마다 값이 고정된다.
export const TRAVEL_MIN_SECONDS = 5;
export const TRAVEL_MAX_SECONDS = 60;
const NEAREST_DISTANCE_M = 3.844e8;      // 달까지의 평균 거리
const FARTHEST_DISTANCE_M = 2.4e22;      // 안드로메다 은하까지의 거리

/**
 * 목적지까지의 재생 시간 (초).
 * @param {number} distanceM  편도 거리 (m)
 * @param {boolean} roundTrip  왕복이면 2배
 */
export function travelDurationSeconds(distanceM, roundTrip = false) {
  const d = Math.max(distanceM, 1);
  const lo = Math.log10(NEAREST_DISTANCE_M);
  const hi = Math.log10(FARTHEST_DISTANCE_M);
  const t = clamp01((Math.log10(d) - lo) / (hi - lo));
  const seconds = TRAVEL_MIN_SECONDS + t * (TRAVEL_MAX_SECONDS - TRAVEL_MIN_SECONDS);
  return roundTrip ? seconds * 2 : seconds;
}

/**
 * 진행률 p에서의 항행 상태.
 * @param {object} args
 * @param {number} args.distance    편도 거리 (m)
 * @param {boolean} args.roundTrip  왕복이면 true
 * @param {{ earthTime: number, shipTime: number }} args.result  전체 여행의 경과 시간 (s)
 * @param {number} args.progress    0 ~ 1
 * @returns {{
 *   progress: number,
 *   outbound: boolean,      갈 때면 true, 돌아올 때면 false
 *   fromEarth: number,      지금 지구에서 떨어진 거리 (m)
 *   toTarget: number,       지금 목적지까지 남은 거리 (m). 왕복 복귀 구간에서는 멀어진다
 *   travelled: number,      실제로 지나온 총 거리 (m)
 *   earthElapsed: number,   지구에서 흐른 시간 (s)
 *   shipElapsed: number,    우주선에서 흐른 시간 (s)
 * }}
 */
export function journeyAt({ distance, roundTrip = false, result, progress }) {
  const p = clamp01(progress);
  const total = roundTrip ? distance * 2 : distance;
  const travelled = total * p;
  const outbound = !roundTrip || p <= 0.5;
  // 왕복 복귀 구간에서는 지구까지의 거리가 다시 줄어든다
  const fromEarth = outbound ? travelled : total - travelled;
  const toTarget = outbound ? distance - fromEarth : distance - (total - travelled);
  return {
    progress: p,
    outbound,
    fromEarth,
    toTarget: Math.abs(toTarget),
    travelled,
    earthElapsed: result.earthTime * p,
    shipElapsed: result.shipTime * p,
  };
}

/**
 * 각반지름 (rad). 반지름 R인 천체가 거리 d에서 얼마나 크게 보이는가.
 * @param {number} radiusM
 * @param {number} distanceM
 */
export function angularRadius(radiusM, distanceM) {
  if (distanceM <= radiusM) return Math.PI / 2;   // 표면에 닿음
  return Math.atan(radiusM / distanceM);
}

/**
 * 상대론적 도플러 인자 (정면으로 다가갈 때). 1보다 크면 파란쪽, 작으면 붉은쪽.
 * @param {number} beta   v / c, 0 이상 1 미만
 * @param {boolean} approaching  다가가는 쪽이면 true (뒤쪽 별이면 false)
 */
export function dopplerFactor(beta, approaching = true) {
  const b = Math.min(Math.max(beta, 0), 0.999999);
  const factor = Math.sqrt((1 + b) / (1 - b));
  return approaching ? factor : 1 / factor;
}

/**
 * 상대론적 광행차. 정지 좌표계에서 진행 방향과 이루는 각 θ에 있는 별이, 달리는 우주선에서는 θ′에 보인다.
 * cos θ′ = (cos θ + β) / (1 + β·cos θ)
 * β가 커질수록 θ′가 작아진다. 즉 온 하늘의 별이 진행 방향 앞쪽으로 몰려 보인다 (전조등 효과).
 * @param {number} theta  rad, 0 = 진행 방향 정면
 * @param {number} beta
 * @returns {number} θ′ (rad)
 */
export function aberratedAngle(theta, beta) {
  const b = Math.min(Math.max(beta, 0), 0.999999);
  const c = Math.cos(theta);
  return Math.acos(Math.min(Math.max((c + b) / (1 + b * c), -1), 1));
}

/**
 * 속도를 β로. 화면 쪽에서 자주 쓰므로 여기에 둔다.
 * @param {number} speed  m/s
 */
export function beta(speed) {
  return Math.min(Math.max(speed / SPEED_OF_LIGHT, 0), 0.999999);
}
