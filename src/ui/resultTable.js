// 결과 수치 표 (5단계, D-14)
// 역할: 지구 시간 / 우주선 시간 / 차이 를 표로 보여준다. 계산은 하지 않고 state.result를 받아 그린다.

import { formatDuration, formatDurationApprox } from '../utils/formatTime.js';
import { formatDistance, formatNumber } from '../utils/units.js';

/**
 * @param {HTMLElement} container
 * @returns {{ update: (result: object, context: object) => void }}
 *   result: physics/timeDilation.js의 computeTimeDilation 반환값
 *   context: { destinationName, tripTypeLabel }
 */
export function createResultTable(container) {
  const caption = document.createElement('p');
  caption.className = 'result-caption';
  caption.id = 'result-caption';

  const table = document.createElement('table');
  table.className = 'result-table';
  table.id = 'result-table';
  table.innerHTML = `
    <thead>
      <tr><th>구분</th><th>경과 시간</th><th>요약</th></tr>
    </thead>
    <tbody>
      <tr><th>지구에서 흐른 시간</th><td id="result-earth"></td><td id="result-earth-approx"></td></tr>
      <tr><th>우주선에서 흐른 시간</th><td id="result-ship"></td><td id="result-ship-approx"></td></tr>
      <tr class="result-diff"><th>차이 (지구 − 우주선)</th><td id="result-diff"></td><td id="result-diff-approx"></td></tr>
    </tbody>
  `;

  const note = document.createElement('p');
  note.className = 'result-note';
  note.id = 'result-note';

  container.appendChild(caption);
  container.appendChild(table);
  container.appendChild(note);

  const cell = (id) => container.querySelector(`#${id}`);

  function update(result, context = {}) {
    const { destinationName = '', tripTypeLabel = '' } = context;
    caption.textContent = `${destinationName} ${tripTypeLabel} · 이동 거리 ${formatDistance(result.totalDistance)}`;

    cell('result-earth').textContent = formatDuration(result.earthTime);
    cell('result-earth-approx').textContent = formatDurationApprox(result.earthTime);
    cell('result-ship').textContent = formatDuration(result.shipTime);
    cell('result-ship-approx').textContent = formatDurationApprox(result.shipTime);
    cell('result-diff').textContent = formatDuration(result.difference);
    cell('result-diff-approx').textContent = formatDurationApprox(result.difference);

    const ratio = result.gamma;
    note.textContent = `로런츠 인자 γ = ${formatNumber(ratio, 4)} · 지구에서 흐른 시간은 우주선의 ${formatNumber(ratio, 2)}배`;
  }

  return { update };
}
