// 우주인 지표 탐사 (20단계, D-77)
// 역할: 착륙 뒤 우주인이 수행할 임무 목록과, 걷기·점프의 물리를 계산한다.
// 화면도 Three.js도 모르는 순수 함수. 검증은 tests/physics.test.js.
//
// 걷기: 천체 중력이 약할수록 한 걸음이 멀리 가고 점프가 높다.
//   같은 힘으로 뛰어오를 때 도달 높이 h = v₀² / (2g) 이므로, 달(1.62)에서는 지구(9.81)의 약 6배 높이가 된다.
// 임무 판정: 우주인이 목표 지점 반경 안에 들어와 있으면 수행할 수 있다.

/** 임무 목표 지점 (착륙선 기준 상대 위치, m) */
export const EXPLORATION_TASKS = [
  { id: 'flag', label: '깃발 꽂기', key: 'E', at: { x: 22, z: -14 }, radius: 6,
    hint: '착륙선 옆 평지에 깃발을 세운다' },
  { id: 'sample-a', label: '표본 채집 ①', key: 'E', at: { x: -34, z: 26 }, radius: 6,
    hint: '밝은 돌무더기에서 겉흙을 담는다' },
  { id: 'sample-b', label: '표본 채집 ②', key: 'E', at: { x: 48, z: 40 }, radius: 6,
    hint: '크레이터 가장자리에서 암석을 집는다' },
  { id: 'photo', label: '기념 촬영', key: 'E', at: { x: -18, z: -38 }, radius: 7,
    hint: '착륙선이 잘 보이는 자리에서 사진을 찍는다' },
  { id: 'return', label: '착륙선 복귀', key: 'E', at: { x: 0, z: 0 }, radius: 8,
    hint: '모든 임무를 마치고 사다리로 돌아간다', last: true },
];

/** 지구 표준 중력 (비교 기준) */
const G_EARTH = 9.81;
/** 지구에서의 걷는 속도 (m/s)와 점프 초속도 (m/s) */
const WALK_SPEED_EARTH = 2.2;
const JUMP_SPEED = 2.6;

/**
 * 천체 중력에 맞춘 걷기·점프 값.
 * 걷는 속도는 중력이 약할수록 조금 빨라진다(√ 비례). 점프 높이는 1/g 에 비례한다.
 * @param {number} gravity  m/s²
 * @returns {{ walkSpeed: number, jumpSpeed: number, jumpHeight: number, fallTime: number }}
 */
export function walkParameters(gravity) {
  const g = Math.max(gravity, 0.05);
  const walkSpeed = WALK_SPEED_EARTH * Math.sqrt(G_EARTH / g) ** 0.5;   // 달에서 약 1.4배
  const jumpHeight = (JUMP_SPEED * JUMP_SPEED) / (2 * g);
  const fallTime = (2 * JUMP_SPEED) / g;
  return { walkSpeed, jumpSpeed: JUMP_SPEED, jumpHeight, fallTime };
}

/**
 * 우주인이 지금 수행할 수 있는 임무 (반경 안에 들어와 있고 아직 안 한 것).
 * 마지막 임무(복귀)는 나머지를 모두 끝내야 할 수 있다.
 * @param {{ x: number, z: number }} position
 * @param {Record<string, boolean>} done
 */
export function taskInReach(position, done = {}) {
  const others = EXPLORATION_TASKS.filter((t) => !t.last);
  const allOthersDone = others.every((t) => done[t.id]);
  return EXPLORATION_TASKS.find((t) => {
    if (done[t.id]) return false;
    if (t.last && !allOthersDone) return false;
    const dx = position.x - t.at.x;
    const dz = position.z - t.at.z;
    return Math.hypot(dx, dz) <= t.radius;
  }) ?? null;
}

/**
 * 가장 가까운 남은 임무와 거리 (안내 화살표용).
 * @param {{ x: number, z: number }} position
 * @param {Record<string, boolean>} done
 * @returns {{ task: object, distance: number } | null}
 */
export function nearestTask(position, done = {}) {
  const others = EXPLORATION_TASKS.filter((t) => !t.last);
  const allOthersDone = others.every((t) => done[t.id]);
  let best = null;
  for (const t of EXPLORATION_TASKS) {
    if (done[t.id]) continue;
    if (t.last && !allOthersDone) continue;
    const distance = Math.hypot(position.x - t.at.x, position.z - t.at.z);
    if (!best || distance < best.distance) best = { task: t, distance };
  }
  return best;
}

/**
 * 탐사 완료 여부와 점수.
 * @param {Record<string, boolean>} done
 * @returns {{ complete: boolean, doneCount: number, total: number, score: number }}
 */
export function explorationScore(done = {}) {
  const total = EXPLORATION_TASKS.length;
  const doneCount = EXPLORATION_TASKS.filter((t) => done[t.id]).length;
  return {
    complete: doneCount === total,
    doneCount,
    total,
    score: Math.round((doneCount / total) * 100),
  };
}
