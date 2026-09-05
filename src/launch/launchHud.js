// 발사 장면 HUD (11단계에 기본형, 14단계에서 확장)
// 역할: 경과 시간, 고도, 속도, 현재 단계 표시. 배속 버튼과 건너뛰기 버튼.

import { TIME_SCALES } from './launchTimeline.js';
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
 * @returns {{ update: (timeline: object) => void }}
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
      <span>질량 <b id="hud-mass">0 t</b></span>
    </div>
    <div class="hud-row hud-controls">
      <span class="hud-label">배속</span>
      <span id="hud-timescale" class="button-group compact"></span>
      <button type="button" class="preset-button" id="hud-skip">건너뛰기</button>
    </div>
  `;
  container.appendChild(hud);

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

  const el = (id) => hud.querySelector(`#${id}`);

  function update(timeline) {
    const sim = timeline.sim;
    el('hud-clock').textContent = formatClock(sim.getTime());
    el('hud-phase').textContent = timeline.getPhase();
    el('hud-altitude').textContent = `${formatNumber(sim.getAltitude() / 1000, 1)} km`;
    el('hud-speed').textContent = `${formatNumber(sim.getSpeed() / 1000, 2)} km/s`;
    el('hud-mass').textContent = `${formatNumber(sim.getMass() / 1000, 0)} t`;
    for (const [n, b] of scaleButtons) b.classList.toggle('active', timeline.getTimeScale() === n);
  }

  return { update };
}
