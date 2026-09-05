// 생존 여부 아이콘 (7단계, D-14, D-33)
// 각 생물이 우주선에 탔을 때 / 지구에 남았을 때 도착 시점에 살아 있는지를 아이콘으로 보여준다.

import { formatDurationApprox } from '../utils/formatTime.js';

const ALIVE = '✅ 생존';
const DEAD = '💀 사망';

/**
 * @param {HTMLElement} container
 * @returns {{ update: (judgements: Array) => void }}
 *   judgements: physics/survival.js의 judgeAll 반환값
 */
export function createSurvivalIcons(container) {
  const table = document.createElement('table');
  table.className = 'survival-table';
  table.id = 'survival-table';
  table.innerHTML = `
    <thead>
      <tr><th>생물</th><th>수명</th><th>우주선에 탔다면</th><th>지구에 남았다면</th></tr>
    </thead>
    <tbody></tbody>
  `;
  container.appendChild(table);
  const tbody = table.querySelector('tbody');

  function cell(judgement) {
    const td = document.createElement('td');
    td.className = judgement.alive ? 'alive' : 'dead';
    const detail = judgement.alive
      ? `남은 수명 ${formatDurationApprox(judgement.remaining)}`
      : `수명을 ${formatDurationApprox(-judgement.remaining)} 초과`;
    td.innerHTML = `<strong>${judgement.alive ? ALIVE : DEAD}</strong><br><small>${detail}</small>`;
    return td;
  }

  function update(judgements) {
    tbody.innerHTML = '';
    for (const { organism, onShip, onEarth } of judgements) {
      const tr = document.createElement('tr');
      const name = document.createElement('td');
      name.textContent = `${organism.icon} ${organism.name}`;
      const life = document.createElement('td');
      life.textContent = organism.lifespanLabel;
      life.className = 'muted';
      tr.appendChild(name);
      tr.appendChild(life);
      tr.appendChild(cell(onShip));
      tr.appendChild(cell(onEarth));
      tbody.appendChild(tr);
    }
  }

  return { update };
}
