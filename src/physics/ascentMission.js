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
 * nominalSeconds: 팔콘 헤비 기본 제원으로 시뮬레이션을 돌려 얻은 예상 도달 시각(초, 발사부터).
 *   판정에는 쓰지 않는다. 진행 막대가 이정표 사이에서도 부드럽게 차오르게 하는 데만 쓴다(ascentProgress).
 */
export const ASCENT_STEPS = [
  {
    id: 'liftoff', label: '이륙', key: '1', kind: 'auto', nominalSeconds: 0.5,
    hint: '엔진 점화, 발사대를 떠난다',
    reached: (sim) => sim.getTime() > 0.5,
  },
  {
    id: 'pitch', label: '피치 기동', key: '2', kind: 'note', nominalSeconds: 29,
    hint: '고도 2 km — 수직에서 진행 방향으로 서서히 눕기 시작한다',
    reached: (sim) => sim.getAltitude() >= 2_000,
  },
  {
    id: 'maxq', label: 'Max-Q 통과', key: '3', kind: 'note', nominalSeconds: 63,
    hint: '고도 12 km — 공기 저항이 가장 센 지점을 지난다',
    reached: (sim) => sim.getAltitude() >= 12_000,
  },
  {
    id: 'boosters', label: '측면 부스터 분리', key: '4', kind: 'auto', nominalSeconds: 145,
    hint: '양옆 부스터 2기가 떨어져 나가 착륙장으로 돌아간다',
    reached: (sim) => sim.bodies.some((b) => b.stageId?.startsWith('booster')),
  },
  {
    id: 'core', label: '중앙 코어 분리', key: '5', kind: 'auto', nominalSeconds: 203,
    hint: '코어가 분리되어 바다 위 무인선으로 향한다',
    reached: (sim) => sim.bodies.some((b) => b.stageId === 'core'),
  },
  {
    id: 'fairing', label: '페어링 분리', key: '6', kind: 'note', nominalSeconds: 215,
    hint: '고도 120 km — 공기가 거의 없어 탑재체 덮개를 버린다',
    reached: (sim) => sim.getAltitude() >= 120_000,
  },
  {
    id: 'orbit', label: '궤도 진입 · 우주선 출발', key: '7', kind: 'auto', nominalSeconds: 493,
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
 * 상승 진행률 0~1 (19단계 → 21단계에서 연속 진행으로 수정).
 *
 * 왜 바꿨나: 도달한 이정표 수만 세면 막대가 0 → 14% → 29%처럼 한 칸씩 튄다.
 *   그 사이에도 로켓은 계속 올라가고 있으므로 막대도 계속 차올라야 한다.
 *
 * 방법: 이정표마다 예상 도달 시각(`nominalSeconds`)이 있으므로,
 *   지금 시각이 어느 두 이정표 사이인지 보고 그 안에서 비례 배분한다.
 *   즉 발사 시각표를 따라 흐르는 시계 눈금과 같다. 이정표를 눌러 건너뛰면 시뮬레이션 시각도
 *   함께 뛰므로 막대도 그만큼 앞으로 간다.
 *   실제 종료는 시뮬레이션이 정한다(`isComplete`). 그전까지는 99%를 넘지 않게 막아,
 *   아직 궤도에 못 올랐는데 100%로 보이는 일이 없게 한다.
 *
 * @param {object} sim
 * @returns {number} 0~1
 */
export function ascentProgress(sim) {
  if (!sim) return 0;
  if (sim.isComplete()) return 1;
  const n = ASCENT_STEPS.length;
  const t = sim.getTime();

  let value = 1;
  for (let i = 0; i < n; i += 1) {
    const prev = i === 0 ? 0 : ASCENT_STEPS[i - 1].nominalSeconds;
    const cur = ASCENT_STEPS[i].nominalSeconds;
    if (t >= cur) continue;
    value = (i + (t - prev) / Math.max(cur - prev, 0.001)) / n;
    break;
  }
  return Math.min(Math.max(value, 0), 0.99);
}
