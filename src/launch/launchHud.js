// 발사 장면 HUD (11단계 기본형, 14단계 확장)
// 역할: 위쪽에 경과 시간·단계·배속·건너뛰기, 아래쪽에 팔콘 헤비 중계 화면 같은 텔레메트리 바 (D-48).
//       텔레메트리 바는 두 칸이다. 왼쪽은 주 우주선(붙어 있는 단), 오른쪽은 보조 화면이 비추는 착륙 대상.
// 물리 계산은 하지 않는다. 값은 timeline.sim과 착륙 대상 물체에서 읽기만 한다.

import { TIME_SCALES } from './launchTimeline.js';
import { bodyAltitude, bodySpeed, landingPhaseLabel } from './landingTarget.js';
import { formatNumber } from '../utils/units.js';

function formatClock(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `T+ ${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * @param {HTMLElement} container  HUD를 넣을 요소 (3D 캔버스 위에 겹침)
 * @param {{ onTimeScale: (n: number) => void, onSkip: () => void }} handlers
 * @returns {{ update: (timeline: object, landingBody?: object | null) => void }}
 */
export function createLaunchHud(container, handlers) {
  const hud = document.createElement('div');
  hud.className = 'launch-hud';
  hud.innerHTML = `
    <div class="hud-row">
      <span class="hud-clock" id="hud-clock">T+ 00:00</span>
      <span class="hud-phase" id="hud-phase">발사 대기</span>
    </div>
    <div class="hud-row hud-stats">
      <span>고도 <b id="hud-altitude">0.0 km</b></span>
      <span>속도 <b id="hud-speed">0.00 km/s</b></span>
      <span title="속도의 수직 성분. 고도는 정확히 이 속도로 오른다">상승 <b id="hud-vspeed">0 m/s</b></span>
      <span>질량 <b id="hud-mass">0 t</b></span>
    </div>
    <div class="hud-row hud-controls">
      <span class="hud-label">배속</span>
      <span id="hud-timescale" class="button-group compact"></span>
      <button type="button" class="preset-button" id="hud-skip">건너뛰기</button>
    </div>
  `;
  container.appendChild(hud);

  // ---- 아래쪽 텔레메트리 바 (14단계) ----
  const telemetry = document.createElement('div');
  telemetry.className = 'launch-telemetry';
  telemetry.innerHTML = `
    <div class="tele-column" id="tele-vehicle">
      <div class="tele-title" id="tele-vehicle-title">우주선</div>
      <div class="tele-values">
        <span>속도 <b id="tele-vehicle-speed">0.00 km/s</b></span>
        <span>고도 <b id="tele-vehicle-alt">0.0 km</b></span>
      </div>
    </div>
    <div class="tele-column tele-landing" id="tele-landing" hidden>
      <div class="tele-title"><span id="tele-landing-title">착륙 대상</span> <span class="tele-phase" id="tele-landing-phase"></span></div>
      <div class="tele-values">
        <span>속도 <b id="tele-landing-speed">0.00 km/s</b></span>
        <span>고도 <b id="tele-landing-alt">0.0 km</b></span>
        <span>목표 <b id="tele-landing-site">-</b></span>
      </div>
    </div>
  `;
  container.appendChild(telemetry);

  const scaleGroup = hud.querySelector('#hud-timescale');
  const scaleButtons = new Map();
  for (const n of TIME_SCALES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset-button';
    b.textContent = `${n}배`;
    b.addEventListener('click', () => handlers.onTimeScale(n));
    scaleGroup.appendChild(b);
    scaleButtons.set(n, b);
  }
  hud.querySelector('#hud-skip').addEventListener('click', () => handlers.onSkip());

  const el = (id) => container.querySelector(`#${id}`);

  /**
   * @param {object} timeline
   * @param {object | null} [landingBody]  보조 화면이 비추는 착륙 대상. 없으면 오른쪽 칸을 숨긴다
   */
  function update(timeline, landingBody = null) {
    const sim = timeline.sim;
    el('hud-clock').textContent = formatClock(sim.getTime());
    el('hud-phase').textContent = timeline.getPhase();
    el('hud-altitude').textContent = `${formatNumber(sim.getAltitude() / 1000, 1)} km`;
    el('hud-speed').textContent = `${formatNumber(sim.getSpeed() / 1000, 2)} km/s`;
    el('hud-mass').textContent = `${formatNumber(sim.getMass() / 1000, 0)} t`;
    // 21단계(D-92): 고도가 왜 그렇게 오르는지 보이도록 상승 속도(수직 성분)를 함께 띄운다.
    // 로켓이 옆으로 누울수록 이 값이 줄고, 그만큼 고도 곡선도 완만해진다.
    el('hud-vspeed').textContent = `${formatNumber(sim.getVerticalSpeed?.() ?? 0, 0)} m/s`;
    for (const [n, b] of scaleButtons) b.classList.toggle('active', timeline.getTimeScale() === n);

    // 왼쪽 칸: 붙어 있는 단(발사 초반은 로켓 전체, 코어 분리 뒤에는 2단과 우주선)
    const attached = sim.stages.filter((st) => st.attached);
    el('tele-vehicle-title').textContent = attached.length === 0 ? '우주선'
      : attached.length === 1 ? `${attached[0].label} · 우주선`
      : '로켓';
    el('tele-vehicle-speed').textContent = `${formatNumber(sim.getSpeed() / 1000, 2)} km/s`;
    el('tele-vehicle-alt').textContent = `${formatNumber(sim.getAltitude() / 1000, 1)} km`;

    // 오른쪽 칸: 착륙 대상
    const landing = el('tele-landing');
    if (!landingBody) {
      landing.hidden = true;
      return;
    }
    landing.hidden = false;
    el('tele-landing-title').textContent = landingBody.label;
    el('tele-landing-phase').textContent = landingPhaseLabel(landingBody);
    el('tele-landing-speed').textContent = `${formatNumber(bodySpeed(landingBody) / 1000, 2)} km/s`;
    el('tele-landing-alt').textContent = `${formatNumber(Math.max(bodyAltitude(landingBody), 0) / 1000, 1)} km`;
    el('tele-landing-site').textContent = landingBody.targetLabel ?? '-';
  }

  return { update };
}
