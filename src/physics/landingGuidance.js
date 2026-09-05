// 재착륙 유도 (13단계)
// 공식과 근거: docs/03_physics.md 6.5절. 세 구간: 부스트백 연소 → 자유 낙하 → 착륙 연소
// 화면(DOM)을 다루지 않는다. 분리된 물체(body)의 상태를 받아 이번 적분 간격에 낼 추력 가속도를 돌려준다.
//
// 근사: 남은 낙하 시간과 낙하 지점 예측에는 국소 평면(평평한 지면, 일정 중력) 근사를 쓴다.
//       부스터 고도(수십~수백 km)에서는 지구 곡률의 영향이 작아 유도 목적으로 충분하다.
// 설계 (D-41: 착륙은 항상 성공하도록):
//   - 부스트백은 수평 속도를 "목표 지점에 떨어질 값"으로 맞춘다. 무인선 착륙 단은 목표가 정해져 있지 않으므로
//     수평 속도를 0으로 만든 뒤, 그 자리 바로 아래를 목표(무인선 위치)로 삼는다.
//   - 착륙 연소 시작 고도는 계획 감속도(planDecelG)로 계산하고, 실제 연소는 그보다 큰 상한(landingMaxG)까지 낼 수 있어
//     적분 오차나 중력 변화가 있어도 지면 위에서 멈출 수 있다.
//   - 마지막 100 m는 고도에 비례하는 하강 속도로 부드럽게 내려와 접지 속도가 3 m/s 이하가 된다.
//   - 착륙 연소 중 수평은 위치 오차와 수평 속도를 함께 줄이는 비례-미분 제어로 목표 위에 맞춘다.
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

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * 이번 간격에 물체가 낼 추력 가속도를 정한다. body.guidance 에 단계 상태를 저장한다.
 * @param {object} body  { r, v, mass, dryMass, propellant, engines, targetDownrange, guidance }
 *   targetDownrange 가 null 이면(무인선) 부스트백이 끝난 자리 아래를 목표로 정한다.
 * @param {number} h     적분 간격 (s)
 * @returns {{ ax: number, ay: number, thrust: number, landed: boolean }}
 */
export function guideBody(body, h) {
  if (!body.guidance) body.guidance = { phase: 'coast', timer: 0 };
  const gd = body.guidance;
  const f = localFrame(body);
  const maxThrust = body.engines.count * body.engines.thrustVacuumN;
  const maxAccel = maxThrust / body.mass;
  const lateralCap = GUIDANCE.lateralMaxG * g0;

  let aUp = 0;     // 수직 방향 추력 가속도 (+ 위)
  let aEast = 0;   // 수평 방향 추력 가속도 (+ 진행 방향)
  let landed = false;

  // 낙하 중 수평 보정: 탄도 예측으로 목표에 떨어질 수평 속도를 맞춘다
  function ballisticCorrection() {
    if (body.targetDownrange == null) return 0;
    const tf = timeToGround(f.alt, f.vr, f.g);
    if (tf < 1) return 0;
    const vtRequired = (body.targetDownrange - f.s) / tf;
    return clamp((vtRequired - f.vt) / h, -lateralCap, lateralCap);
  }

  // 착륙 연소 중 수평 보정: 위치 오차를 줄이는 방향의 목표 속도로, 속도를 부드럽게 맞춘다 (비례-미분)
  function terminalCorrection() {
    if (body.targetDownrange == null) return 0;
    const error = body.targetDownrange - f.s;
    const vtDesired = clamp(error / GUIDANCE.terminalPositionTau, -GUIDANCE.terminalMaxLateralSpeed, GUIDANCE.terminalMaxLateralSpeed);
    return clamp((vtDesired - f.vt) / GUIDANCE.terminalVelocityTau, -lateralCap, lateralCap);
  }

  switch (gd.phase) {
    case 'coast':
      gd.timer += h;
      if (gd.timer >= GUIDANCE.coastSeconds) gd.phase = 'boostback';
      break;

    case 'boostback': {
      // 목표가 있으면 그 지점에 떨어질 수평 속도로, 없으면(무인선) 수평 속도 0으로
      const tf = timeToGround(f.alt, f.vr, f.g);
      const vtRequired = body.targetDownrange != null && tf > 0 ? (body.targetDownrange - f.s) / tf : 0;
      const dv = vtRequired - f.vt;
      if (Math.abs(dv) < 2) {
        if (body.targetDownrange == null) body.targetDownrange = f.s;   // 무인선 위치 확정: 바로 아래
        gd.phase = 'fall';
      } else {
        const cap = Math.min(GUIDANCE.boostbackMaxG * g0, maxAccel);
        aEast = Math.sign(dv) * Math.min(cap, Math.abs(dv) / h);
      }
      break;
    }

    case 'fall': {
      aEast = ballisticCorrection();
      const speedDown = Math.max(0, -f.vr);
      const planDecel = Math.min(GUIDANCE.planDecelG * g0, maxAccel);
      const burnAlt = landingBurnAltitude(speedDown, planDecel, f.g) + GUIDANCE.landingMarginM;
      if (f.vr < 0 && f.alt <= burnAlt) gd.phase = 'landing';
      break;
    }

    case 'landing': {
      const speedDown = Math.max(0, -f.vr);
      const cap = Math.min(GUIDANCE.landingMaxG * g0, maxAccel);
      if (f.alt > GUIDANCE.finalApproachM) {
        // 호버슬램: 지면(여유 고도)에서 정확히 멈추는 연속 감속 v² / (2h), 여기에 중력을 더해 추력으로 낸다
        const hEff = Math.max(f.alt - GUIDANCE.finalApproachM * 0.5, 1);
        const needed = (speedDown * speedDown) / (2 * hEff);
        aUp = clamp(f.g + needed, 0, cap);
      } else {
        // 최종 접근: 수평이 목표 위에 맞고 수평 속도가 작을 때만 내려간다. 아니면 고도를 유지(호버)하며 먼저 정렬한다.
        const error = body.targetDownrange == null ? 0 : body.targetDownrange - f.s;
        const aligned = Math.abs(error) <= GUIDANCE.alignPositionM && Math.abs(f.vt) <= GUIDANCE.alignSpeed;
        const vDesired = aligned ? Math.max(GUIDANCE.finalMinDescent, GUIDANCE.finalDescentRate * f.alt) : 0;
        // 하강 속도 오차를 줄이는 가속도. speedDown은 아래 +, vr은 위 +
        aUp = clamp(f.g + (speedDown - vDesired) * GUIDANCE.finalGain + Math.max(0, f.vr) * GUIDANCE.finalGain * -1, 0, cap);
      }
      aEast = terminalCorrection();
      if (f.alt <= GUIDANCE.touchdownAltitude && speedDown <= GUIDANCE.touchdownSpeed && Math.abs(f.vt) <= GUIDANCE.touchdownSpeed) {
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
