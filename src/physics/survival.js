// 생존 판정 (7단계, D-33)
// 규칙: 출발 나이 + 경과 시간 < 수명 이면 생존. 화면(DOM)을 다루지 않는다.
// 단위: 모두 초

/**
 * @param {object} organism   data/organisms.js 항목 (lifespan: 초)
 * @param {number} departureAge  출발 시점 나이 (초)
 * @param {number} elapsed       경과 시간 (초)
 * @returns {{ alive: boolean, ageAtArrival: number, remaining: number }}
 *   ageAtArrival: 도착 시점 나이 (초). remaining: 남은 수명 (초, 음수면 초과)
 */
export function judgeSurvival(organism, departureAge, elapsed) {
  const ageAtArrival = departureAge + elapsed;
  const remaining = organism.lifespan - ageAtArrival;
  return { alive: remaining > 0, ageAtArrival, remaining };
}

/**
 * 생물 목록 전체에 대해 우주선 탑승 / 지구 잔류 두 경우를 판정한다.
 * @param {object[]} organisms
 * @param {Record<string, number>} ages  id → 출발 나이(초)
 * @param {{ earthTime: number, shipTime: number }} result
 * @returns {Array<{ organism: object, onShip: object, onEarth: object }>}
 */
export function judgeAll(organisms, ages, result) {
  return organisms.map((organism) => {
    const age = ages[organism.id] ?? 0;
    return {
      organism,
      onShip: judgeSurvival(organism, age, result.shipTime),
      onEarth: judgeSurvival(organism, age, result.earthTime),
    };
  });
}
