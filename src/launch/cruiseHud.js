// 항행 화면 계기판 (15단계)
// 역할: 항행 중 목적지, 진행률, 남은 거리, 지구·우주선 시간, β와 γ를 3D 화면 위에 겹쳐 보여준다.
// 계산은 하지 않는다. physics/journey.js와 physics/lorentz.js가 준 값을 받아 그리기만 한다.

import { formatDistance, formatNumber } from '../utils/units.js';
import { formatDurationApprox } from '../utils/formatTime.js';

/**
 * @param {HTMLElement} container  3D 캔버스 위에 겹칠 요소
 * @returns {{ update: (info: object) => void, setVisible: (on: boolean) => void }}
 */
export function createCruiseHud(container) {
  const hud = document.createElement('div');
  hud.className = 'cruise-hud';
  hud.hidden = true;
  hud.innerHTML = `
    <div class="cruise-head">
      <span class="cruise-target" id="cruise-target">목적지</span>
      <span class="cruise-leg" id="cruise-leg"></span>
    </div>
    <div class="cruise-track"><div class="cruise-fill" id="cruise-fill"></div></div>
    <div class="cruise-grid">
      <div><span>남은 거리</span><b id="cruise-remaining">-</b></div>
      <div><span>지나온 거리</span><b id="cruise-travelled">-</b></div>
      <div><span>지구 시간</span><b id="cruise-earth">-</b></div>
      <div><span>우주선 시간</span><b id="cruise-ship">-</b></div>
      <div><span>속도 β = v/c</span><b id="cruise-beta">-</b></div>
      <div><span>로런츠 인자 γ</span><b id="cruise-gamma">-</b></div>
    </div>
  `;
  container.appendChild(hud);
  const el = (id) => hud.querySelector(`#${id}`);

  /**
   * @param {object} info
   * @param {string} info.targetName
   * @param {boolean} info.outbound
   * @param {boolean} info.roundTrip
   * @param {object} info.journey   physics/journey.js의 journeyAt 결과
   * @param {number} info.beta
   * @param {number} info.gamma
   */
  function update(info) {
    const { journey } = info;
    el('cruise-target').textContent = info.targetName;
    el('cruise-leg').textContent = info.roundTrip
      ? (journey.outbound ? '가는 중' : '돌아오는 중')
      : '편도';
    el('cruise-fill').style.width = `${journey.progress * 100}%`;
    el('cruise-remaining').textContent = formatDistance(journey.toTarget);
    el('cruise-travelled').textContent = formatDistance(journey.travelled);
    el('cruise-earth').textContent = formatDurationApprox(journey.earthElapsed);
    el('cruise-ship').textContent = formatDurationApprox(journey.shipElapsed);
    el('cruise-beta').textContent = formatNumber(info.beta, info.beta < 0.01 ? 6 : 4);
    el('cruise-gamma').textContent = formatNumber(info.gamma, 4);
  }

  return {
    update,
    setVisible(on) { hud.hidden = !on; },
  };
}
