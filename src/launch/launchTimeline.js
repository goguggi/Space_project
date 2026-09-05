// 발사 진행 관리 (11단계, D-25)
// 역할: 시뮬레이션 시계를 돌리고(배속 1~10배), 사건을 모으고, 현재 단계 이름을 제공한다.
// 물리 계산은 physics/launchDynamics.js가 한다. 3D 배치는 launchController가 한다.

import { createLaunchSimulation } from '../physics/launchDynamics.js';

export const TIME_SCALES = [1, 2, 5, 10];

// 건너뛰기 때 시뮬레이션을 한 번에 얼마나 돌릴지 (시뮬레이션 초). 팔콘 헤비 발사는 약 9분이면 끝난다
const SKIP_CHUNK_SECONDS = 60;
const SKIP_MAX_SECONDS = 3_600;

/**
 * @param {object} spec  로켓 제원
 * @returns {{
 *   sim: object, start: () => void, pause: () => void, reset: () => void, skip: () => object[],
 *   setTimeScale: (n: number) => void, getTimeScale: () => number,
 *   update: (dtReal: number) => object[],   실제 경과 시간을 받아 시뮬레이션을 전진시키고 사건을 돌려준다
 *   isRunning: () => boolean, getPhase: () => string, getEvents: () => object[],
 * }}
 */
export function createLaunchTimeline(spec) {
  let sim = createLaunchSimulation(spec);
  let running = false;
  let timeScale = 1;
  let phase = '발사 대기';
  const events = [];

  function applyEvents(newEvents) {
    for (const e of newEvents) {
      events.push(e);
      if (e.type === 'ignition') phase = `${e.label} 점화`;
      if (e.type === 'separation') phase = `${e.label} 분리`;
      if (e.type === 'complete') {
        phase = '2단 분리 완료, 우주선 출발';
        running = false;
      }
      if (e.type === 'crash') {
        phase = '추락 (궤도 진입 실패)';
        running = false;
      }
    }
  }

  return {
    get sim() { return sim; },
    start() {
      if (sim.isComplete()) return;
      running = true;
      if (sim.getTime() === 0) phase = '발사';
    },
    pause() { running = false; },
    reset() {
      sim = createLaunchSimulation(spec);
      running = false;
      phase = '발사 대기';
      events.length = 0;
    },
    skip() {
      // 남은 발사 과정을 한 번에 계산한다 (화면 갱신 없이)
      const collected = [];
      let guard = 0;
      while (!sim.isComplete() && guard < SKIP_MAX_SECONDS / SKIP_CHUNK_SECONDS) {
        collected.push(...sim.step(SKIP_CHUNK_SECONDS));
        guard += 1;
      }
      applyEvents(collected);
      running = false;
      return collected;
    },
    setTimeScale(n) { timeScale = n; },
    getTimeScale: () => timeScale,
    update(dtReal) {
      if (!running) return [];
      const newEvents = sim.step(dtReal * timeScale);
      applyEvents(newEvents);
      return newEvents;
    },
    isRunning: () => running,
    getPhase: () => phase,
    getEvents: () => events.slice(),
  };
}
