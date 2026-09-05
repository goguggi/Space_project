// 생물별 수명 대비 경과 시간 막대 그래프 (7단계, D-14, D-34 / 15단계에서 실시간 연동)
// 방식: HTML/CSS div 막대, 로그 눈금 (수명이 1일~400년, 경과 시간이 초~억 년까지 걸치므로)
// 각 행: 수명 막대(회색) 위에 지구 시간(파랑)과 우주선 시간(초록) 막대를 겹쳐 그린다.
// 출발 나이가 있으면 수명 막대 왼쪽에 이미 지난 부분을 다른 색으로 표시한다.
//
// 15단계: 임무 시계가 진행률을 주면 막대가 그만큼만 자란다. 매 프레임 DOM을 다시 만들지 않고
//   폭(style.width)만 바꾼다. 수명을 넘어선 막대는 '넘침' 표시가 붙는다 (D-55).

import { ORGANISMS } from '../data/organisms.js';
import { formatDurationApprox } from '../utils/formatTime.js';

// 로그 눈금 하한: 1시간 (3,600초). 그보다 짧은 시간은 0 길이로 그린다.
const LOG_FLOOR = Math.log10(3_600);

const TICKS = [
  [3_600, '1시간'], [86_400, '1일'], [31_557_600, '1년'], [31_557_600 * 100, '100년'],
  [31_557_600 * 1e4, '1만 년'], [31_557_600 * 1e6, '100만 년'], [31_557_600 * 1e8, '1억 년'],
  [31_557_600 * 1e10, '100억 년'],
];

/**
 * @param {HTMLElement} container
 * @returns {{
 *   setResult: (result: object, ages: Record<string, number>) => void,
 *   setProgress: (progress: number) => void,
 * }}
 */
export function createLifespanChart(container) {
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  legend.innerHTML = `
    <span><i class="swatch swatch-life"></i>수명</span>
    <span><i class="swatch swatch-age"></i>출발 전에 이미 산 기간</span>
    <span><i class="swatch swatch-earth"></i>지구에서 흐른 시간</span>
    <span><i class="swatch swatch-ship"></i>우주선에서 흐른 시간</span>
  `;

  const chart = document.createElement('div');
  chart.className = 'chart';
  chart.id = 'lifespan-chart';

  const axis = document.createElement('div');
  axis.className = 'chart-axis';
  axis.id = 'lifespan-chart-axis';

  container.appendChild(legend);
  container.appendChild(chart);
  container.appendChild(axis);

  // ---- 행을 한 번만 만들어 두고, 갱신할 때는 폭과 글자만 바꾼다 ----
  const rows = ORGANISMS.map((organism) => {
    const row = document.createElement('div');
    row.className = 'chart-row';
    row.innerHTML = `
      <div class="chart-name" title="${organism.lifespanLabel}">${organism.icon} ${organism.name}</div>
      <div class="chart-track">
        <div class="bar bar-life"></div>
        <div class="bar bar-age"></div>
        <div class="bar bar-earth"></div>
        <div class="bar bar-ship"></div>
      </div>
      <div class="chart-mark"></div>
    `;
    chart.appendChild(row);
    return {
      organism,
      row,
      life: row.querySelector('.bar-life'),
      age: row.querySelector('.bar-age'),
      earth: row.querySelector('.bar-earth'),
      ship: row.querySelector('.bar-ship'),
      mark: row.querySelector('.chart-mark'),
    };
  });

  let result = null;
  let ages = {};
  let progress = 1;
  let toPercent = () => 0;

  /** 결과가 바뀌면 눈금(로그 축)을 다시 잡는다 */
  function setResult(nextResult, nextAges) {
    result = nextResult;
    ages = nextAges ?? {};
    const maxSeconds = Math.max(result.earthTime, ...ORGANISMS.map((o) => o.lifespan)) * 1.5;
    const logMax = Math.log10(maxSeconds);
    toPercent = (seconds) => {
      if (seconds <= 0) return 0;
      const log = Math.log10(seconds);
      return Math.min(Math.max((log - LOG_FLOOR) / (logMax - LOG_FLOOR), 0), 1) * 100;
    };

    axis.innerHTML = '';
    for (const [seconds, text] of TICKS) {
      if (seconds > maxSeconds) break;
      const tick = document.createElement('span');
      tick.className = 'chart-tick';
      tick.style.left = `${toPercent(seconds)}%`;
      tick.textContent = text;
      axis.appendChild(tick);
    }
    draw();
  }

  /** 임무 진행률(0~1)에 맞춰 막대 길이를 바꾼다 */
  function setProgress(nextProgress) {
    progress = Math.min(Math.max(nextProgress, 0), 1);
    draw();
  }

  function draw() {
    if (!result) return;
    const earthNow = result.earthTime * progress;
    const shipNow = result.shipTime * progress;

    for (const r of rows) {
      const age = ages[r.organism.id] ?? 0;
      r.life.style.width = `${toPercent(r.organism.lifespan)}%`;
      r.life.title = `수명 ${r.organism.lifespanLabel}`;
      r.age.style.width = `${toPercent(age)}%`;
      r.age.title = age > 0 ? `출발 전 ${formatDurationApprox(age)}` : '';
      r.earth.style.width = `${toPercent(age + earthNow)}%`;
      r.earth.title = `지구 시간 ${formatDurationApprox(earthNow)}`;
      r.ship.style.width = `${toPercent(age + shipNow)}%`;
      r.ship.title = `우주선 시간 ${formatDurationApprox(shipNow)}`;

      // 지금 이 순간 살아 있는가: 출발 나이 + 지금까지 흐른 시간 < 수명
      const shipAlive = age + shipNow < r.organism.lifespan;
      const earthAlive = age + earthNow < r.organism.lifespan;
      r.row.classList.toggle('over-earth', !earthAlive);
      r.row.classList.toggle('over-ship', !shipAlive);
      r.mark.textContent = shipAlive ? '🚀 생존' : earthAlive ? '🚀 사망' : '💀 둘 다 사망';
      r.mark.className = `chart-mark ${shipAlive ? 'alive' : earthAlive ? 'half' : 'dead'}`;
    }
  }

  return { setResult, setProgress };
}
