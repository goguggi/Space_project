// 착륙 절차 (18단계, D-67) — KSP처럼 사용자가 직접 수행하는 체크리스트
// 역할: 착륙 중 해야 할 절차의 순서와 조건, 수행 여부에 따른 등급을 계산한다.
// 화면도 Three.js도 모르는 순수 함수. 검증은 tests/physics.test.js.
//
// D-41(착륙은 항상 성공)은 그대로 둔다. 절차를 놓쳐도 부서지지 않고, 등급만 낮아진다.

/**
 * 절차 목록. `readyAbove`~`readyBelow` 고도 구간에서 수행할 수 있다 (m).
 * required: 놓치면 감점되는 항목
 */
export const SURFACE_STEPS = [
  { id: 'burn', label: '감속 연소 시작', key: 'Z', readyBelow: 2_000, readyAbove: 600,
    hint: '고도 2,000 m 아래에서 엔진을 켜 낙하를 늦춘다', required: true },
  { id: 'legs', label: '착륙 다리 펴기', key: 'X', readyBelow: 900, readyAbove: 60,
    hint: '고도 900 m 아래에서 다리를 편다', required: true },
  { id: 'final', label: '최종 접근 자세', key: 'C', readyBelow: 200, readyAbove: 15,
    hint: '고도 200 m 아래에서 수직 자세를 잡는다', required: true },
  { id: 'shutdown', label: '엔진 정지', key: 'V', readyBelow: 12, readyAbove: 0,
    hint: '접지 직전에 엔진을 끈다', required: false },
];

// 지구 재진입용 절차 (D-66). 고도 80 km에서 시작하므로 기준 고도가 훨씬 높다.
export const REENTRY_STEPS = [
  { id: 'heatshield', label: '열 차폐 자세', key: 'Z', readyBelow: 80_000, readyAbove: 45_000,
    hint: '고도 80 km, 대기와 부딪히기 전에 바닥을 아래로 돌린다', required: true },
  { id: 'burn', label: '감속 연소 시작', key: 'X', readyBelow: 30_000, readyAbove: 8_000,
    hint: '고도 30 km 아래에서 엔진을 켜 낙하를 늦춘다', required: true },
  { id: 'legs', label: '착륙 다리 펴기', key: 'C', readyBelow: 4_000, readyAbove: 300,
    hint: '고도 4 km 아래에서 다리를 편다', required: true },
  { id: 'final', label: '최종 접근 자세', key: 'V', readyBelow: 600, readyAbove: 20,
    hint: '고도 600 m 아래에서 수직 자세를 잡는다', required: true },
];

/** 예전 이름 (달·화성 착륙 절차) */
export const LANDING_STEPS = SURFACE_STEPS;

/**
 * 천체에 맞는 절차 목록. 지구는 대기가 있어 재진입 절차를 쓴다.
 * @param {object} visual  data/celestialBodies.js 항목
 */
export function stepsFor(visual) {
  return visual?.reentry ? REENTRY_STEPS : SURFACE_STEPS;
}

/**
 * 지금 고도에서 수행할 수 있는(그리고 아직 안 한) 절차.
 * @param {number} altitude  m
 * @param {Record<string, boolean>} done  절차 id → 수행 여부
 * @returns {object | null}
 */
export function activeStep(altitude, done = {}, steps = SURFACE_STEPS) {
  return steps.find((s) => !done[s.id] && altitude <= s.readyBelow) ?? null;
}

/**
 * 놓친 절차 (수행 가능 구간을 이미 지나갔는데 안 한 것).
 * @param {number} altitude
 * @param {Record<string, boolean>} done
 */
export function missedSteps(altitude, done = {}, steps = SURFACE_STEPS) {
  return steps.filter((s) => !done[s.id] && altitude < s.readyAbove);
}

/**
 * 절차 수행이 하강에 주는 영향.
 * 감속 연소를 안 켜면 더 빨리 떨어지고, 다리를 안 펴면 접지 속도가 그대로 충격이 된다.
 * @param {Record<string, boolean>} done
 * @returns {{ descentScale: number, legsOut: boolean }}
 *   descentScale: 하강 속도에 곱할 값 (1보다 크면 더 빠르게 떨어진다)
 */
export function descentPenalty(done = {}) {
  return {
    descentScale: done.burn ? 1 : 1.8,
    legsOut: Boolean(done.legs),
  };
}

/**
 * 착륙 등급 (D-67). 절차 수행률과 접지 속도로 A~D를 매긴다.
 * @param {Record<string, boolean>} done
 * @param {number} touchdownSpeed  접지 속도 (m/s)
 * @returns {{ grade: string, score: number, notes: string[] }}
 *   score: 0~100
 */
export function landingGrade(done = {}, touchdownSpeed = 1.5, steps = SURFACE_STEPS) {
  const notes = [];
  const required = steps.filter((s) => s.required);
  const doneCount = required.filter((s) => done[s.id]).length;
  // 절차 60점 + 접지 속도 40점
  const stepScore = (doneCount / required.length) * 60;
  // 1.5 m/s 이하면 만점, 12 m/s 이상이면 0점
  const speedScore = Math.max(0, Math.min(1, (12 - touchdownSpeed) / (12 - 1.5))) * 40;
  const score = Math.round(stepScore + speedScore);

  for (const s of required) if (!done[s.id]) notes.push(`${s.label} 안 함`);
  if (touchdownSpeed > 3) notes.push(`접지 속도 ${touchdownSpeed.toFixed(1)} m/s (권장 3 이하)`);
  if (done.shutdown) notes.push('엔진 정지 수행 (+)');

  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 55 ? 'C' : 'D';
  return { grade, score, notes };
}

/**
 * 조준 보너스 (D-68). 목적지가 조준선 안에 머문 비율로 점수를 준다.
 * @param {number} onTargetSeconds  조준선 안에 있던 시간
 * @param {number} totalSeconds     전체 시간
 * @returns {{ ratio: number, bonus: number }}  bonus: 0~20점
 */
export function aimBonus(onTargetSeconds, totalSeconds) {
  if (totalSeconds <= 0) return { ratio: 0, bonus: 0 };
  const ratio = Math.min(Math.max(onTargetSeconds / totalSeconds, 0), 1);
  return { ratio, bonus: Math.round(ratio * 20) };
}
