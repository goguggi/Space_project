// 경유 여행 경로 (21단계, D-95)
// 역할: 지구 → (경유지) → 목적지 → 지구 처럼 여러 구간으로 나뉜 여정을 구간 목록으로 만든다.
// 화면도 Three.js도 모른다. 검증은 tests/physics.test.js.
//
// 두 천체 사이의 거리에 대하여:
//   이 프로젝트의 자료(`src/data/destinations.js`)에는 **지구에서 잰 평균 거리**만 있다.
//   두 천체 사이의 실제 거리는 그때그때의 위치에 따라 달라지고, 최소 |d₁ − d₂| 에서 최대 d₁ + d₂ 사이다.
//   여기서는 여행 계획에서 흔히 쓰는 **가장 가까울 때의 거리 |d₁ − d₂|** 를 쓴다.
//   (예: 화성 d=2.25e11 m, 목성 d=7.78e11 m → 화성에서 목성까지 5.53e11 m)
//   실제 임무는 두 천체가 가까워지는 시기(발사 창)를 골라 떠나므로, 이 값이 계획 거리에 가깝다.
//   지구가 한쪽 끝이면 그냥 그 천체의 거리다.

/**
 * 두 지점 사이의 거리 (m).
 * @param {number} d1  지구에서 잰 거리 (m). 지구 자신은 0
 * @param {number} d2
 */
export function legDistance(d1, d2) {
  return Math.abs(d1 - d2);
}

/**
 * 여정을 구간으로 나눈다.
 * @param {{
 *   destinationDistance: number, destinationName: string,
 *   waypointDistance?: number|null, waypointName?: string|null,
 *   roundTrip: boolean,
 * }} spec
 * @returns {{ legs: {from: string, to: string, distance: number}[], totalDistance: number }}
 */
export function buildRoute(spec) {
  const {
    destinationDistance, destinationName,
    waypointDistance = null, waypointName = null,
    roundTrip = false,
  } = spec;

  // 들를 곳들을 순서대로: 지구 → (경유지) → 목적지 → (지구)
  const stops = [{ name: '지구', distance: 0 }];
  if (waypointDistance != null && waypointName) {
    stops.push({ name: waypointName, distance: waypointDistance });
  }
  stops.push({ name: destinationName, distance: destinationDistance });
  if (roundTrip) stops.push({ name: '지구', distance: 0 });

  const legs = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    legs.push({
      from: stops[i].name,
      to: stops[i + 1].name,
      distance: legDistance(stops[i].distance, stops[i + 1].distance),
    });
  }
  return { legs, totalDistance: legs.reduce((sum, l) => sum + l.distance, 0) };
}
