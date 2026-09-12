// 로런츠 인자 곡선 (18단계, R-4)
// 역할: γ = 1/√(1−β²) 곡선을 그리고, 지금 속도가 그 곡선의 어디인지 점으로 보여준다.
// 속도 슬라이더를 움직이면 점이 곡선 위를 따라 움직인다.
//
// 그리는 방법: SVG를 직접 만든다 (외부 라이브러리 없음). 세로축은 γ = 1~10만 보여주고
//   그 위(0.995c 이상)는 잘라낸다. "0.9c까지는 완만하다가 그 뒤로 치솟는다"가 이 그림의 요점이다.

import { gamma } from '../physics/lorentz.js';
import { SPEED_OF_LIGHT } from '../data/constants.js';
import { formatNumber } from '../utils/units.js';

const W = 320;
const H = 150;
const PAD = { left: 30, right: 10, top: 10, bottom: 22 };
const GAMMA_MAX = 10;
const SAMPLES = 240;

const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const xOf = (beta) => PAD.left + beta * plotW;
const yOf = (g) => PAD.top + plotH - (Math.min(g, GAMMA_MAX) - 1) / (GAMMA_MAX - 1) * plotH;

/** γ 곡선의 경로 문자열 */
function curvePath() {
  const points = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const beta = (i / SAMPLES) * 0.999;
    const g = 1 / Math.sqrt(1 - beta * beta);
    if (g > GAMMA_MAX) {
      // 세로축 위쪽으로 벗어나는 지점에서 멈춘다
      points.push(`${xOf(beta).toFixed(1)},${yOf(GAMMA_MAX).toFixed(1)}`);
      break;
    }
    points.push(`${xOf(beta).toFixed(1)},${yOf(g).toFixed(1)}`);
  }
  return `M ${points.join(' L ')}`;
}

/**
 * @param {HTMLElement} container
 * @returns {{ update: (speed: number) => void }}
 */
export function createLorentzChart(container) {
  const box = document.createElement('div');
  box.className = 'lorentz-chart';

  const gridLines = [0.5, 0.9, 0.99]
    .map((b) => `<line class="lz-grid" x1="${xOf(b)}" y1="${PAD.top}" x2="${xOf(b)}" y2="${PAD.top + plotH}"/>
                 <text class="lz-xtick" x="${xOf(b)}" y="${H - 6}">${b}c</text>`)
    .join('');
  const yTicks = [1, 2, 5, 10]
    .map((g) => `<line class="lz-grid" x1="${PAD.left}" y1="${yOf(g)}" x2="${PAD.left + plotW}" y2="${yOf(g)}"/>
                 <text class="lz-ytick" x="${PAD.left - 5}" y="${yOf(g) + 3}">${g}</text>`)
    .join('');

  box.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="lorentz-svg" role="img"
         aria-label="속도에 따른 로런츠 인자 곡선">
      ${yTicks}
      ${gridLines}
      <path class="lz-curve" d="${curvePath()}"/>
      <line class="lz-guide" id="lz-guide-x" x1="0" y1="0" x2="0" y2="0"/>
      <line class="lz-guide" id="lz-guide-y" x1="0" y1="0" x2="0" y2="0"/>
      <circle class="lz-dot" id="lz-dot" r="4" cx="${xOf(0)}" cy="${yOf(1)}"/>
      <text class="lz-axis" x="${PAD.left + plotW}" y="${H - 6}" text-anchor="end">β = v/c</text>
      <text class="lz-axis" x="${PAD.left - 26}" y="${PAD.top + 8}">γ</text>
    </svg>
    <p class="lorentz-readout" id="lz-readout">β = 0 · γ = 1</p>
  `;
  container.appendChild(box);

  const dot = box.querySelector('#lz-dot');
  const guideX = box.querySelector('#lz-guide-x');
  const guideY = box.querySelector('#lz-guide-y');
  const readout = box.querySelector('#lz-readout');

  /**
   * @param {number} speed  m/s
   */
  function update(speed) {
    const beta = Math.min(Math.max((speed ?? 0) / SPEED_OF_LIGHT, 0), 0.999);
    const g = gamma(speed ?? 0);
    const x = xOf(beta);
    const y = yOf(g);
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));
    guideX.setAttribute('x1', x.toFixed(1));
    guideX.setAttribute('x2', x.toFixed(1));
    guideX.setAttribute('y1', (PAD.top + plotH).toFixed(1));
    guideX.setAttribute('y2', y.toFixed(1));
    guideY.setAttribute('x1', PAD.left);
    guideY.setAttribute('x2', x.toFixed(1));
    guideY.setAttribute('y1', y.toFixed(1));
    guideY.setAttribute('y2', y.toFixed(1));
    // γ가 10을 넘으면 점이 위쪽 경계에 붙고, 글로 실제 값을 알려준다
    const over = g > GAMMA_MAX;
    dot.classList.toggle('over', over);
    readout.textContent = `β = ${formatNumber(beta, beta < 0.01 ? 6 : 4)} · γ = ${formatNumber(g, 4)}`
      + (over ? ' (그래프 범위 위)' : '');
  }

  update(0);
  return { update };
}
