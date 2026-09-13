// 상승 절차 (19단계, D-73) — 발사부터 궤도 진입까지를 사용자가 짚어 가며 진행한다
// 역할: 상승 중의 이정표(이륙 · 피치 기동 · Max-Q · 부스터 분리 · 코어 분리 · 페어링 분리 · 궤도 진입)를
//       정의하고, 지금 시뮬레이션 상태에서 어디까지 왔는지 판정한다.
// 화면도 Three.js도 모르는 순수 함수. 검증은 tests/physics.test.js.
//
// 왜 필요한가: 팔콘 헤비의 상승은 8분 30초라 가만히 보고만 있으면 지루하다.
//   이정표를 눌러 그 지점까지 건너뛸 수 있게 하면, 보고 싶은 장면만 골라 볼 수 있고
//   무엇이 언제 일어나는지도 함께 배운다.

/**
 * 각 이정표는 `reached(sim)`으로 도달 여부를 판정한다.
 * kind: 'auto'  물리가 알아서 일으키는 사건 (분리 등) — 눌러서 그 시점까지 건너뛴다
 *       'note'  연출·설명용 지점 — 역시 건너뛰기로 이동한다
 */
export const ASCENT_STEPS = [
  {
    id: 'liftoff', label: '이륙', key: '1', kind: 'auto',
    hint: '엔진 점화, 발사대를 떠난다',
    reached: (sim) => sim.getTime() > 0.5,
  },
  {
    id: 'pitch', label: '피치 기동', key: '2', kind: 'note',
    hint: '고도 2 km — 수직에서 진행 방향으로 서서히 눕기 시작한다',
    reached: (sim) => sim.getAltitude() >= 2_000,
  },
  {
    id: 'maxq', label: 'Max-Q 통과', key: '3', kind: 'note',
    hint: '고도 12 km — 공기 저항이 가장 센 지점을 지난다',
    reached: (sim) => sim.getAltitude() >= 12_000,
  },
  {
    id: 'boosters', label: '측면 부스터 분리', key: '4', kind: 'auto',
    hint: '양옆 부스터 2기가 떨어져 나가 착륙장으로 돌아간다',
    reached: (sim) => sim.bodies.some((b) => b.stageId?.startsWith('booster')),
  },
  {
    id: 'core', label: '중앙 코어 분리', key: '5', kind: 'auto',
    hint: '코어가 분리되어 바다 위 무인선으로 향한다',
    reached: (sim) => sim.bodies.some((b) => b.stageId === 'core'),
  },
  {
    id: 'fairing', label: '페어링 분리', key: '6', kind: 'note',
    hint: '고도 120 km — 공기가 거의 없어 탑재체 덮개를 버린다',
    reached: (sim) => sim.getAltitude() >= 120_000,
  },
  {
    id: 'orbit', label: '궤도 진입 · 우주선 출발', key: '7', kind: 'auto',
    hint: '2단 연소가 끝나고 우주선이 목적지로 떠난다',
    reached: (sim) => sim.isComplete(),
  },
];

/**
 * 지금까지 도달한 이정표들.
 * @param {object} sim  physics/launchDynamics.js의 시뮬레이션
 * @returns {Record<string, boolean>}
 */
export function reachedSteps(sim) {
  const done = {};
  for (const step of ASCENT_STEPS) done[step.id] = Boolean(sim && step.reached(sim));
  return done;
}

/**
 * 다음에 올 이정표 (아직 도달하지 않은 것 중 첫 번째).
 * @param {object} sim
 * @returns {object | null}
 */
export function nextStep(sim) {
  return ASCENT_STEPS.find((s) => !s.reached(sim)) ?? null;
}

/**
 * 상승 진행률 0~1 (도달한 이정표 수 기준). 화면의 진행 막대에 쓴다.
 * @param {object} sim
 */
export function ascentProgress(sim) {
  if (!sim) return 0;
  const done = ASCENT_STEPS.filter((s) => s.reached(sim)).length;
  return done / ASCENT_STEPS.length;
}
