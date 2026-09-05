// 계산 검증 (4단계). physics.test.html이 불러온다.
// 기준값: docs/03_physics.md 5절
// 외부 테스트 도구 없이, 표에 통과/실패를 표시한다.

import { SPEED_OF_LIGHT, LIGHT_YEAR, SECONDS_PER_YEAR } from '../src/data/constants.js';
import { gamma, gammaMinusOne } from '../src/physics/lorentz.js';
import { computeTimeDilation, TRIP_TYPES } from '../src/physics/timeDilation.js';
import { createLaunchSimulation } from '../src/physics/launchDynamics.js';
import { FALCON_HEAVY } from '../src/data/falconHeavy.js';
import { selectLandingTarget, bodyAltitude } from '../src/launch/landingTarget.js';
import { journeyAt, angularRadius, dopplerFactor, aberratedAngle, beta } from '../src/physics/journey.js';
import { descentProfile } from '../src/physics/landingGuidance.js';
import { CELESTIAL_BODIES, isLandable } from '../src/data/celestialBodies.js';
import { STANDARD_GRAVITY, EARTH_RADIUS } from '../src/data/constants.js';

const c = SPEED_OF_LIGHT;

// 각 항목: 이름, 기대값, 계산값, 상대 허용 오차
const cases = [
  ['γ, v = 0.99c', 7.0888, gamma(0.99 * c), 1e-4],
  ['γ, v = 0.9c', 2.2942, gamma(0.9 * c), 1e-4],
  ['γ, v = 0.5c', 1.1547, gamma(0.5 * c), 1e-4],
  ['γ, v = 0.1c', 1.005038, gamma(0.1 * c), 1e-5],
  ['γ − 1, v = 11.2 km/s', 6.98e-10, gammaMinusOne(11_200), 2e-3],
  ['급수/직접 계산 경계 연속성 (β = 10⁻³ 전후)', gammaMinusOne(0.999e-3 * c), gammaMinusOne(1.001e-3 * c), 5e-3],
];

// 프록시마 4.246 ly, 0.99c, 편도
const proxima = computeTimeDilation({ distance: 4.246 * LIGHT_YEAR, speed: 0.99 * c });
cases.push(['프록시마 편도 지구 시간 (년)', 4.289, proxima.earthTime / SECONDS_PER_YEAR, 1e-3]);
cases.push(['프록시마 편도 우주선 시간 (년)', 0.605, proxima.shipTime / SECONDS_PER_YEAR, 2e-3]);

// 달 384,400 km, 11.2 km/s, 편도
const moon = computeTimeDilation({ distance: 384_400_000, speed: 11_200 });
cases.push(['달 편도 지구 시간 (시간)', 9.53, moon.earthTime / 3600, 1e-3]);
cases.push(['달 편도 시간 차이 (마이크로초)', 24, moon.difference * 1e6, 2e-2]);

// 왕복 = 편도 × 2
const moonRound = computeTimeDilation({ distance: 384_400_000, speed: 11_200, tripType: TRIP_TYPES.ROUND_TRIP });
cases.push(['달 왕복 지구 시간 = 편도 × 2', moon.earthTime * 2, moonRound.earthTime, 1e-12]);
cases.push(['달 왕복 차이 = 편도 × 2', moon.difference * 2, moonRound.difference, 1e-12]);

// 정밀도: 낮은 속도에서 직접 빼기와 급수 계산의 차이가 작아야 한다 (자릿수 유지 확인)
cases.push(['차이 정밀 계산 vs 직접 빼기 (11.2 km/s, 달)', moon.earthTime - moon.shipTime, moon.difference, 1e-3]);

// ---- 발사 물리 (11단계) ----
// 치올콥스키 검증: 중력을 끄고 1단 로켓을 태우면 Δv = Isp·g₀·ln(m₀/m_f) 와 같아야 한다 (docs/03_physics.md 6.4절)
const singleStage = {
  payloadMassKg: 1_000,
  stages: [{
    id: 's1', label: '1단', role: 'serial', separationOrder: 1,
    dryMassKg: 9_000, propellantMassKg: 90_000,
    // 해수면 추력 = 진공 추력 으로 두어 고도 보간의 영향을 없앤다
    engines: { count: 1, thrustSeaLevelN: 1_500_000, thrustVacuumN: 1_500_000, ispSeaLevelS: 300, ispVacuumS: 300 },
    recovery: { enabled: false },
  }],
};
const noGravity = createLaunchSimulation(singleStage, { gravity: false, pitchProgram: () => 0, stepSeconds: 1 / 60 });
while (!noGravity.isComplete()) noGravity.step(1);
const expectedDeltaV = 300 * STANDARD_GRAVITY * Math.log(100_000 / 10_000);
cases.push(['치올콥스키 Δv (중력 없음, 1단)', expectedDeltaV, noGravity.getSpeed(), 2e-3]);

// 팔콘 헤비 기본 피치 프로그램: 분리 시점이 실제 기록과 같은 자릿수이고, 2단 연소 종료 시 궤도 이상에 도달해야 한다 (6.7절)
const fh = createLaunchSimulation(FALCON_HEAVY, { stepSeconds: 1 / 20 });
const fhEvents = [];
while (!fh.isComplete() && fh.getTime() < 1200) fhEvents.push(...fh.step(1));
const upperBurnoutAltitude = fh.getAltitude();
const upperBurnoutSpeed = fh.getSpeed();
// 회수 단이 모두 접지할 때까지 계속 (13단계)
while (!fh.isAllSettled() && fh.getTime() < 2400) fhEvents.push(...fh.step(1));
const boosterSep = fhEvents.find((e) => e.type === 'separation' && e.stageId === 'booster-left');
const coreSep = fhEvents.find((e) => e.type === 'separation' && e.stageId === 'core');
cases.push(['팔콘 헤비 부스터 분리 시각 (s, 실제 약 150)', 150, boosterSep ? boosterSep.time : 0, 0.15]);
cases.push(['팔콘 헤비 코어 분리 시각 (s, 실제 약 185)', 185, coreSep ? coreSep.time : 0, 0.15]);
cases.push(['팔콘 헤비 2단 종료 고도 ≥ 200 km (km)', 200, Math.min(upperBurnoutAltitude / 1000, 200), 1e-6]);
cases.push(['팔콘 헤비 2단 종료 속도 ≥ 7.8 km/s (km/s)', 7.8, Math.min(upperBurnoutSpeed / 1000, 7.8), 1e-6]);
cases.push(['팔콘 헤비 추락 없음 (1 = 정상)', 1, fhEvents.some((e) => e.type === 'crash') ? 0 : 1, 1e-9]);

// ---- 재착륙 (13단계): 부스터는 착륙장(2,000 m), 코어는 무인선에 3 m/s 이하로 내려앉아야 한다 (docs/03_physics.md 6.5절, D-41) ----
const boosterBody = fh.bodies.find((b) => b.stageId === 'booster-left');
const coreBody = fh.bodies.find((b) => b.stageId === 'core');
cases.push(['부스터 착륙 성공 (1 = landed)', 1, boosterBody?.status === 'landed' ? 1 : 0, 1e-9]);
cases.push(['부스터 접지 속도 ≤ 3 m/s (m/s)', 3, Math.max(boosterBody?.impactSpeed ?? 99, 3), 1e-6]);
cases.push(['부스터 착륙 위치 = 착륙장 2,000 m (m, ±50)', 2000, boosterBody?.landedDownrange ?? 0, 0.025]);
cases.push(['코어 착륙 성공 (1 = landed)', 1, coreBody?.status === 'landed' ? 1 : 0, 1e-9]);
cases.push(['코어 접지 속도 ≤ 3 m/s (m/s)', 3, Math.max(coreBody?.impactSpeed ?? 99, 3), 1e-6]);
cases.push(['코어 착륙 위치 = 무인선 위치 (m)', coreBody?.targetDownrange ?? 1, coreBody?.landedDownrange ?? 0, 1e-3]);
cases.push(['모든 회수 단 접지 완료 (1 = 정상)', 1, fh.isAllSettled() ? 1 : 0, 1e-9]);

// ---- 보조 화면 대상 고르기 (14단계, D-42): 가장 가까운(고도가 가장 낮은) 착륙 대상 ----
// 가짜 물체로 규칙만 확인한다. r은 지구 중심 기준 위치이므로 고도 = |r| − R
const R = EARTH_RADIUS;
const fake = (id, alt, status, landedAt) => ({
  id, label: id, r: { x: 0, y: R + alt }, v: { x: 0, y: 0 },
  recovery: { enabled: true }, status, landedAt,
});
const pickHigherLower = selectLandingTarget([
  fake('high', 40_000, 'falling'),
  fake('low', 5_000, 'falling'),
]);
cases.push(['보조 화면: 낙하 중 두 단 중 고도가 낮은 쪽 (m)', 5000, bodyAltitude(pickHigherLower) , 1e-6]);

const pickWhileOneLanded = selectLandingTarget([
  fake('landed', 0, 'landed', 600),
  fake('still', 30_000, 'falling'),
]);
cases.push(['보조 화면: 낙하 중인 단이 착륙한 단보다 우선 (1 = 그렇다)', 1, pickWhileOneLanded?.id === 'still' ? 1 : 0, 1e-9]);

const pickAllLanded = selectLandingTarget([
  fake('first', 0, 'landed', 642),
  fake('last', 0, 'landed', 721),
]);
cases.push(['보조 화면: 모두 착륙하면 마지막에 내려앉은 단 (접지 시각 s)', 721, pickAllLanded?.landedAt ?? 0, 1e-9]);

cases.push(['보조 화면: 회수 단이 없으면 대상 없음 (1 = null)', 1, selectLandingTarget([]) === null ? 1 : 0, 1e-9]);

// 실제 발사 결과에서는 코어가 마지막으로 내려앉으므로 끝까지 코어를 비춘다
const finalTarget = selectLandingTarget(fh.bodies);
cases.push(['보조 화면: 발사 종료 시 대상 = 중앙 코어 (1 = 그렇다)', 1, finalTarget?.stageId === 'core' ? 1 : 0, 1e-9]);

// ---- 항행 계산 (15단계): docs/03_physics.md 등속 모델 + 상대론적 도플러·광행차 ----
const jResult = { earthTime: 1000, shipTime: 400 };

const jHalf = journeyAt({ distance: 1e12, roundTrip: false, result: jResult, progress: 0.5 });
cases.push(['항행: 편도 절반에서 지구와의 거리 (m)', 5e11, jHalf.fromEarth, 1e-9]);
cases.push(['항행: 편도 절반에서 남은 거리 (m)', 5e11, jHalf.toTarget, 1e-9]);
cases.push(['항행: 편도 절반에서 지구 시간 (s)', 500, jHalf.earthElapsed, 1e-9]);
cases.push(['항행: 편도 절반에서 우주선 시간 (s)', 200, jHalf.shipElapsed, 1e-9]);

// 왕복은 절반에서 목적지에 닿고, 그 뒤에는 지구로 되돌아온다
const jTurn = journeyAt({ distance: 1e12, roundTrip: true, result: jResult, progress: 0.5 });
cases.push(['항행: 왕복 반환점에서 남은 거리 = 0 (m, 1 = 그렇다)', 1, Math.abs(jTurn.toTarget) < 1 ? 1 : 0, 1e-9]);
const jBack = journeyAt({ distance: 1e12, roundTrip: true, result: jResult, progress: 0.75 });
cases.push(['항행: 왕복 3/4 지점에서 지구와의 거리 (m)', 5e11, jBack.fromEarth, 1e-9]);
cases.push(['항행: 왕복 3/4 지점은 복귀 구간 (1 = 그렇다)', 1, jBack.outbound ? 0 : 1, 1e-9]);

// 각반지름: 지구 반지름 6,371 km를 100,000 km 거리에서 보면 atan(6371/100000)
cases.push(['각반지름 θ = atan(R/d) (rad)', Math.atan(6371 / 100000), angularRadius(6.371e6, 1e8), 1e-12]);

// 상대론적 도플러: β = 0.6 → √(1.6/0.4) = 2
cases.push(['도플러 인자 (β = 0.6, 정면)', 2, dopplerFactor(0.6, true), 1e-12]);
cases.push(['도플러 인자 (β = 0.6, 후면) = 1/2', 0.5, dopplerFactor(0.6, false), 1e-12]);

// 광행차: β = 0.6 에서 옆쪽(90°) 별은 앞쪽으로 당겨져 cos θ′ = +β → θ′ = acos(0.6) ≈ 53°
cases.push(['광행차 θ = 90°, β = 0.6 (rad)', Math.acos(0.6), aberratedAngle(Math.PI / 2, 0.6), 1e-12]);
cases.push(['광행차: 정면(0°)은 그대로 정면 (rad, 1 = 그렇다)', 1, aberratedAngle(0, 0.6) < 1e-9 ? 1 : 0, 1e-9]);
cases.push(['광행차: 뒤쪽(180°)은 그대로 뒤쪽 (rad)', Math.PI, aberratedAngle(Math.PI, 0.6), 1e-9]);
cases.push(['광행차: 항상 앞으로 몰린다 (θ′ < θ, 1 = 그렇다)', 1, aberratedAngle(2, 0.9) < 2 ? 1 : 0, 1e-9]);

cases.push(['β = v/c (0.99c)', 0.99, beta(0.99 * c), 1e-12]);

// ---- 천체 착륙 (17단계, D-61) ----
// 달 표면 중력 1.62 m/s²에서 2,000 m 자유낙하 시간 = √(2·2000/1.62) ≈ 49.7초
const moonG = CELESTIAL_BODIES.moon.surfaceGravity;
const dStart = descentProfile(0, 2000, moonG);
const dMid = descentProfile(0.5, 2000, moonG);
const dEnd = descentProfile(1, 2000, moonG);
cases.push(['착륙: 시작 고도 (m)', 2000, dStart.altitude, 1e-12]);
cases.push(['착륙: 하강 시간 = √(2h/g) (s)', Math.sqrt((2 * 2000) / moonG), dStart.duration, 1e-12]);
cases.push(['착륙: 절반 시점 고도 = h₀/4 (m)', 500, dMid.altitude, 1e-12]);
cases.push(['착륙: 접지 고도 = 0 (m, 1 = 그렇다)', 1, dEnd.altitude < 1e-9 ? 1 : 0, 1e-9]);
cases.push(['착륙: 접지 속도 = 1.5 m/s', 1.5, dEnd.speed, 1e-12]);
cases.push(['착륙: 속도는 계속 줄어든다 (1 = 그렇다)', 1, dStart.speed > dMid.speed && dMid.speed > dEnd.speed ? 1 : 0, 1e-9]);
cases.push(['착륙 가능: 달 (1 = 그렇다)', 1, isLandable(CELESTIAL_BODIES.moon) ? 1 : 0, 1e-9]);
cases.push(['착륙 가능: 화성 (1 = 그렇다)', 1, isLandable(CELESTIAL_BODIES.mars) ? 1 : 0, 1e-9]);
cases.push(['착륙 불가: 목성 (가스행성, 1 = 그렇다)', 1, isLandable(CELESTIAL_BODIES.jupiter) ? 0 : 1, 1e-9]);
cases.push(['착륙 불가: 태양 (항성, 1 = 그렇다)', 1, isLandable(CELESTIAL_BODIES.sun) ? 0 : 1, 1e-9]);
cases.push(['착륙 불가: 안드로메다 (은하, 1 = 그렇다)', 1, isLandable(CELESTIAL_BODIES.andromeda) ? 0 : 1, 1e-9]);
// 화성은 중력이 커서 같은 높이를 더 빨리 내려온다
cases.push(['착륙: 화성 하강 시간 < 달 (1 = 그렇다)', 1,
  descentProfile(0, 2000, CELESTIAL_BODIES.mars.surfaceGravity).duration < dStart.duration ? 1 : 0, 1e-9]);

// 표 출력
const tbody = document.getElementById('results');
let passed = 0;
for (const [name, expected, actual, tolerance] of cases) {
  const relError = Math.abs(actual - expected) / Math.abs(expected);
  const ok = relError <= tolerance;
  if (ok) passed += 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${name}</td><td>${fmt(expected)}</td><td>${fmt(actual)}</td><td>${tolerance}</td>`
    + `<td class="${ok ? 'pass' : 'fail'}">${ok ? '통과' : '실패'}</td>`;
  tbody.appendChild(tr);
}
const summary = document.getElementById('summary');
summary.textContent = `${passed} / ${cases.length} 통과`;
summary.className = passed === cases.length ? 'pass' : 'fail';

function fmt(v) {
  if (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e9) return v.toExponential(4);
  return v.toPrecision(6);
}
