// 생물별 수명 대비 경과 시간 막대 그래프 (7단계, D-14, D-34)
// 방식: HTML/CSS div 막대, 로그 눈금 (수명이 1일~400년, 경과 시간이 초~억 년까지 걸치므로)
// 각 행: 수명 막대(회색) 위에 지구 시간(파랑)과 우주선 시간(초록) 막대를 겹쳐 그린다.
// 출발 나이가 있으면 수명 막대 왼쪽에 이미 지난 부분을 다른 색으로 표시한다.

import { ORGANISMS } from '../data/organisms.js';
import { formatDurationApprox } from '../utils/formatTime.js';

// 로그 눈금 하한: 1시간 (3,600초). 그보다 짧은 시간은 0 길이로 그린다.
const LOG_FLOOR = Math.log10(3_600);

/**
 * @param {HTMLElement} container
 * @returns {{ update: (result: object, ages: Record<string, number>) => void }}
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

  function update(result, ages) {
    const maxSeconds = Math.max(
      result.earthTime,
      ...ORGANISMS.map((o) => o.lifespan),
    ) * 1.5;
    const logMax = Math.log10(maxSeconds);
    const toPercent = (seconds) => {
      if (seconds <= 0) return 0;
      const log = Math.log10(seconds);
      return Math.min(Math.max((log - LOG_FLOOR) / (logMax - LOG_FLOOR), 0), 1) * 100;
    };

    chart.innerHTML = '';
    for (const organism of ORGANISMS) {
      const age = ages[organism.id] ?? 0;
      const row = document.createElement('div');
      row.className = 'chart-row';

      const name = document.createElement('div');
      name.className = 'chart-name';
      name.textContent = `${organism.icon} ${organism.name}`;
      name.title = organism.lifespanLabel;

      const track = document.createElement('div');
      track.className = 'chart-track';

      const life = document.createElement('div');
      life.className = 'bar bar-life';
      life.style.width = `${toPercent(organism.lifespan)}%`;
      life.title = `수명 ${organism.lifespanLabel}`;

      const aged = document.createElement('div');
      aged.className = 'bar bar-age';
      aged.style.width = `${toPercent(age)}%`;
      aged.title = age > 0 ? `출발 전 ${formatDurationApprox(age)}` : '';

      const earth = document.createElement('div');
      earth.className = 'bar bar-earth';
      earth.style.width = `${toPercent(result.earthTime)}%`;
      earth.title = `지구 시간 ${formatDurationApprox(result.earthTime)}`;

      const ship = document.createElement('div');
      ship.className = 'bar bar-ship';
      ship.style.width = `${toPercent(result.shipTime)}%`;
      ship.title = `우주선 시간 ${formatDurationApprox(result.shipTime)}`;

      track.appendChild(life);
      track.appendChild(aged);
      track.appendChild(earth);
      track.appendChild(ship);

      row.appendChild(name);
      row.appendChild(track);
      chart.appendChild(row);
    }

    // 눈금: 1시간, 1일, 1년, 100년, 1만 년, 100만 년, 1억 년 중 범위 안에 있는 것
    const ticks = [
      [3_600, '1시간'], [86_400, '1일'], [31_557_600, '1년'], [31_557_600 * 100, '100년'],
      [31_557_600 * 1e4, '1만 년'], [31_557_600 * 1e6, '100만 년'], [31_557_600 * 1e8, '1억 년'],
      [31_557_600 * 1e10, '100억 년'],
    ];
    axis.innerHTML = '';
    for (const [seconds, text] of ticks) {
      if (seconds > maxSeconds) break;
      const tick = document.createElement('span');
      tick.className = 'chart-tick';
      tick.style.left = `${toPercent(seconds)}%`;
      tick.textContent = text;
      axis.appendChild(tick);
    }
  }

  return { update };
}
