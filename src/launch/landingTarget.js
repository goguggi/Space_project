// 보조 화면이 비출 착륙 대상 고르기 (14단계, D-42)
// 역할: 분리된 물체 목록에서 "가장 가까운 착륙 대상"을 하나 고르고, 그 물체의 고도·속도·착륙 단계 이름을 알려준다.
// Three.js와 DOM을 모른다. 순수 계산이므로 tests/physics.test.js에서 그대로 검증한다.
//
// D-42: 보조 화면은 1개, 가장 가까운 착륙 대상으로 자동 전환한다.
//   "가장 가까운"은 접지까지 남은 고도가 가장 낮은, 아직 내려오는 중인 회수 단으로 본다.
//   모두 내려앉은 뒤에는 마지막으로 착륙한 단을 계속 비춘다 (사용자 선택: 분리 후 계속 표시).

import { EARTH_RADIUS } from '../data/constants.js';

/** 물체의 고도 (m) */
export function bodyAltitude(body) {
  return Math.hypot(body.r.x, body.r.y) - EARTH_RADIUS;
}

/** 물체의 속도 크기 (m/s) */
export function bodySpeed(body) {
  return Math.hypot(body.v.x, body.v.y);
}

/**
 * 보조 화면이 비출 물체를 고른다.
 * @param {object[]} bodies  sim.bodies (분리된 물체 목록)
 * @returns {object | null}  회수 단이 하나도 없으면 null
 */
export function selectLandingTarget(bodies) {
  const recoverable = bodies.filter((b) => b.recovery?.enabled);
  if (recoverable.length === 0) return null;

  // 1순위: 아직 내려오는 중인 단 가운데 고도가 가장 낮은 것
  const falling = recoverable.filter((b) => b.status === 'falling');
  if (falling.length > 0) {
    return falling.reduce((best, b) => (bodyAltitude(b) < bodyAltitude(best) ? b : best));
  }

  // 2순위: 모두 끝났으면 가장 나중에 내려앉은 단을 계속 비춘다
  return recoverable.reduce((best, b) => ((b.landedAt ?? -Infinity) > (best.landedAt ?? -Infinity) ? b : best));
}

// 착륙 유도 단계(physics/landingGuidance.js의 guidance.phase) → 화면에 쓸 한국어 이름
const PHASE_LABELS = {
  coast: '관성 비행',
  boostback: '부스트백 연소',
  fall: '자유 낙하',
  landing: '착륙 연소',
  landed: '착륙 완료',
};

/**
 * 착륙 단계 이름. 이미 접지했으면 결과(착륙/충돌)를 우선해서 보여준다.
 * @param {object | null} body
 * @returns {string}
 */
export function landingPhaseLabel(body) {
  if (!body) return '-';
  if (body.status === 'landed') return '착륙 완료';
  if (body.status === 'impact') return '지면 충돌';
  return PHASE_LABELS[body.guidance?.phase] ?? '분리 직후';
}
