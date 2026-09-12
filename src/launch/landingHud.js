// 착륙 계기판 (17단계)
// 역할: 착륙 중 천체 이름, 고도, 하강 속도, 표면 중력, 남은 시간을 보여준다.
// 계산은 physics/landingGuidance.js의 descentProfile이 한다.

import { formatNumber } from '../utils/units.js';

/**
 * @param {HTMLElement} container
 * @returns {{ update: (info: object) => void, setVisible: (on: boolean) => void }}
 */
export function createLandingHud(container) {
  const hud = document.createElement('div');
  hud.className = 'landing-hud';
  hud.hidden = true;
  hud.innerHTML = `
    <h3 id="landing-body">목적지</h3>
    <div class="landing-phase" id="landing-phase">하강 중</div>
    <div class="landing-grid">
      <div><span>고도</span><b id="landing-altitude">-</b></div>
      <div><span>하강 속도</span><b id="landing-speed">-</b></div>
      <div><span>표면 중력</span><b id="landing-gravity">-</b></div>
      <div><span>남은 시간</span><b id="landing-eta">-</b></div>
    </div>
  `;
  container.appendChild(hud);
  const el = (id) => hud.querySelector(`#${id}`);

  /**
   * @param {{ bodyName: string, altitude: number, speed: number, gravity: number,
   *           remaining: number, landed: boolean }} info
   */
  function update(info) {
    el('landing-body').textContent = info.bodyName;
    el('landing-phase').textContent = info.landed ? '접지 완료'
      : info.altitude > 55_000 ? '대기권 진입'
      : info.altitude > 25_000 ? '플라스마 구간 (열 차폐)'
      : info.altitude > 8_000 ? '감속 연소'
      : info.altitude > 300 ? '감속 하강'
      : info.altitude > 30 ? '최종 접근' : '접지 직전';
    el('landing-altitude').textContent = info.altitude >= 1000
      ? `${formatNumber(info.altitude / 1000, 2)} km`
      : `${formatNumber(info.altitude, 0)} m`;
    el('landing-speed').textContent = `${formatNumber(info.speed, 1)} m/s`;
    el('landing-gravity').textContent = `${formatNumber(info.gravity, 2)} m/s²`;
    el('landing-eta').textContent = info.landed ? '-' : `${formatNumber(info.remaining, 0)} 초`;
  }

  return {
    update,
    setVisible(on) { hud.hidden = !on; },
  };
}
