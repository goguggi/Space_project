// 재착륙 유도 (13단계)
// 공식과 근거: docs/03_physics.md 6.5절. 세 구간: 부스트백 연소 → 자유 낙하 → 착륙 연소
// 화면(DOM)을 다루지 않는다. 분리된 물체(body)의 상태를 받아 이번 적분 간격에 낼 추력 가속도를 돌려준다.
//
// 근사: 남은 낙하 시간과 낙하 지점 예측에는 국소 평면(평평한 지면, 일정 중력) 근사를 쓴다.
//       부스터 고도(수십~수백 km)에서는 지구 곡률의 영향이 작아 유도 목적으로 충분하다.
// 단위: m, m/s, kg, N, s

import { EARTH_GM, EARTH_RADIUS, STANDARD_GRAVITY } from '../data/constants.js';
import { GUIDANCE } from '../data/landingSites.js';

const g0 = STANDARD_GRAVITY;

/**
 * 고도 h, 수직 속도 vr(위쪽 +), 중력 g 에서 지면까지 걸리는 시간. h + vr·t − ½g·t² = 0 의 양의 근
 */
export function timeToGround(h, vr, g) {
  const disc = vr * vr + 2 * g * h;
  if (disc <= 0 || h <= 0) return 0;
  return (vr + Math.sqrt(disc)) / g;
}

/**
 * 착륙 연소를 시작해야 하는 고도: h = v² / (2·(a − g))  (docs/03_physics.md 6.5절)
 */
export function landingBurnAltitude(speedDown, decel, g) {
  if (decel <= g) return Infinity;
  return (speedDown * speedDown) / (2 * (decel - g));
}

/**
 * 물체의 국소 좌표값을 계산한다.
 * @returns {{ rNorm, up, east, alt, vr, vt, s, g }}
 *   vr: 수직 속도(위 +), vt: 수평 속도(진행 방향 +), s: 발사대에서 진행 방향으로 잰 지표 거리
 */
export function localFrame(body) {
  const rNorm = Math.hypot(body.r.x, body.r.y);
  const up = { x: body.r.x / rNorm, y: body.r.y / rNorm };
  const east = { x: up.y, y: -up.x };
  const alt = rNorm - EARTH_RADIUS;
  const vr = body.v.x * up.x + body.v.y * up.y;
  const vt = body.v.x * east.x + body.v.y * east.y;
  const s = EARTH_RADIUS * Math.atan2(body.r.x, body.r.y);
  const g = EARTH_GM / (rNorm * rNorm);
  return { rNorm, up, east, alt, vr, vt, s, g };
}

/**
 * 지금 상태에서 아무 것도 하지 않으면 떨어질 지표 거리 (탄도 예측)
 */
export function predictedDownrange(body) {
  const f = localFrame(body);
  return f.s + f.vt * timeToGround(f.alt, f.vr, f.g);
}

/**
 * 이번 간격에 물체가 낼 추력 가속도를 정한다. body.guidance 에 단계 상태를 저장한다.
 * @param {object} body  { r, v, mass, dryMass, propellant, engines, targetDownrange, guidance }
 * @param {number} h     적분 간격 (s)
 * @returns {{ ax: number, ay: number, thrust: number, landed: boolean }}
 */
export function guideBody(body, h) {
  if (!body.guidance) body.guidance = { phase: 'coast', timer: 0 };
  const gd = body.guidance;
  const f = localFrame(body);
  const maxThrust = body.engines.count * body.engines.thrustVacuumN;
  const maxAccel = maxThrust / body.mass;

  let aUp = 0;     // 수직 방향 추력 가속도 (+ 위)
  let aEast = 0;   // 수평 방향 추력 가속도 (+ 진행 방향)
  let landed = false;

  // 수평 오차 보정: 예측 낙하 지점이 목표와 다르면 필요한 수평 속도로 맞춘다
  function lateralCorrection(maxG) {
    const tf = timeToGround(f.alt, f.vr, f.g);
    if (tf < 1) return 0;
    const vtRequired = (body.targetDownrange - f.s) / tf;
    const dv = vtRequired - f.vt;
    const cap = maxG * g0;
    // 이번 간격에 dv를 다 내려면 dv/h 가속도가 필요. 상한으로 자른다
    return Math.max(-cap, Math.min(cap, dv / h));
  }

  switch (gd.phase) {
    case 'coast':
      gd.timer += h;
      if (gd.timer >= GUIDANCE.coastSeconds) gd.phase = 'boostback';
      break;

    case 'boostback': {
      // 수평 속도를 목표 지점에 떨어질 값으로 바꾼다
      const tf = timeToGround(f.alt, f.vr, f.g);
      const vtRequired = tf > 0 ? (body.targetDownrange - f.s) / tf : f.vt;
      const dv = vtRequired - f.vt;
      if (Math.abs(dv) < 2) {
        gd.phase = 'fall';
      } else {
        const cap = Math.min(GUIDANCE.boostbackMaxG * g0, maxAccel);
        aEast = Math.sign(dv) * Math.min(cap, Math.abs(dv) / h);
      }
      break;
    }

    case 'fall': {
      aEast = lateralCorrection(GUIDANCE.lateralMaxG);
      const speedDown = Math.max(0, -f.vr);
      const decel = Math.min(GUIDANCE.landingMaxG * g0, maxAccel);
      const burnAlt = landingBurnAltitude(speedDown, decel, f.g) + GUIDANCE.landingMarginM;
      if (f.vr < 0 && f.alt <= burnAlt) gd.phase = 'landing';
      break;
    }

    case 'landing': {
      // 지면에서 정확히 멈추는 연속 감속(호버슬램): 필요한 순수 감속 = v² / (2h). 여기에 중력을 더해 추력으로 낸다
      const speedDown = Math.max(0, -f.vr);
      const altitude = Math.max(f.alt, 0.5);
      const needed = (speedDown * speedDown) / (2 * altitude);
      const cap = Math.min(GUIDANCE.landingMaxG * g0, maxAccel);
      aUp = Math.min(cap, f.g + needed);
      aEast = lateralCorrection(GUIDANCE.lateralMaxG);
      if (f.alt <= 1.0 && speedDown <= GUIDANCE.touchdownSpeed) {
        landed = true;
        gd.phase = 'landed';
      }
      break;
    }

    default:
      break;
  }

  const ax = aUp * f.up.x + aEast * f.east.x;
  const ay = aUp * f.up.y + aEast * f.east.y;
  const thrust = Math.hypot(aUp, aEast) * body.mass;
  return { ax, ay, thrust, landed };
}
