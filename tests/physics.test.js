// 계산 검증 (4단계). physics.test.html이 불러온다.
// 기준값: docs/03_physics.md 5절
// 외부 테스트 도구 없이, 표에 통과/실패를 표시한다.

import { SPEED_OF_LIGHT, LIGHT_YEAR, SECONDS_PER_YEAR } from '../src/data/constants.js';
import { gamma, gammaMinusOne } from '../src/physics/lorentz.js';
import { computeTimeDilation, TRIP_TYPES } from '../src/physics/timeDilation.js';

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
