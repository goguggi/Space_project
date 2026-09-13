// 지표 탐사 화면 (20단계, D-77)
// 역할: 우주인 임무 목록과 조작 안내를 보여주고, 가까운 목표까지 남은 거리를 알려준다.
// 판정은 physics/exploration.js가 한다.

import { EXPLORATION_TASKS } from '../physics/exploration.js';
import { formatNumber } from '../utils/units.js';

/**
 * @param {HTMLElement} container
 * @param {{ onAct: () => void, onFinish: () => void }} handlers
 */
export function createEvaPanel(container, handlers) {
  const box = document.createElement('div');
  box.className = 'checklist eva-panel';
  box.hidden = true;
  box.innerHTML = `
    <div class="checklist-head">
      <span>지표 탐사</span>
      <span class="ascent-hint" id="eva-keys">화면 클릭 → 마우스로 몸 돌리기<br>W A S D 이동 · Shift 달리기 · Space 점프 · E 수행</span>
    </div>
    <ul class="checklist-items" id="eva-items"></ul>
    <div class="eva-status" id="eva-status">착륙선 밖으로 나왔습니다.</div>
    <!-- 21단계(D-96): 임무를 다 하지 않아도 언제든 배로 돌아갈 수 있다 -->
    <button type="button" class="checklist-auto eva-board" id="eva-board">🚀 지금 우주선 타기</button>
    <div class="eva-result" id="eva-result" hidden></div>
  `;
  container.appendChild(box);

  box.querySelector('#eva-board').addEventListener('click', () => handlers.onFinish());

  const listEl = box.querySelector('#eva-items');
  const statusEl = box.querySelector('#eva-status');
  const resultEl = box.querySelector('#eva-result');
  const rows = new Map();

  for (const task of EXPLORATION_TASKS) {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <button type="button" class="checklist-key" data-task="${task.id}">${task.key}</button>
      <span class="checklist-label">${task.label}</span>
      <span class="checklist-state">대기</span>
    `;
    li.title = task.hint;
    li.querySelector('button').addEventListener('click', () => handlers.onAct());
    listEl.appendChild(li);
    rows.set(task.id, { li, state: li.querySelector('.checklist-state') });
  }

  /**
   * @param {{ done: object, reach: object|null, nearest: object|null, jumpHeight: number, gravity: number }} s
   */
  function update(s) {
    for (const task of EXPLORATION_TASKS) {
      const row = rows.get(task.id);
      const isDone = Boolean(s.done[task.id]);
      const isReach = s.reach?.id === task.id;
      row.li.classList.toggle('done', isDone);
      row.li.classList.toggle('active', isReach);
      row.state.textContent = isDone ? '완료' : isReach ? 'E 누르기' : '대기';
    }
    if (s.reach) {
      statusEl.textContent = `${s.reach.label} — ${s.reach.hint}. E를 누르세요.`;
    } else if (s.nearest) {
      statusEl.textContent = `${s.nearest.task.label}까지 ${formatNumber(s.nearest.distance, 0)} m`;
    } else {
      statusEl.textContent = '모든 임무 완료';
    }
  }

  function showResult(score, gravity, jumpHeight) {
    box.querySelector('#eva-board').hidden = true;
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <b>탐사 완료 ${score.doneCount} / ${score.total}</b>
      <div class="grade-notes">표면 중력 ${formatNumber(gravity, 2)} m/s² · 점프 높이 ${formatNumber(jumpHeight, 2)} m</div>
      <button type="button" class="checklist-auto" id="eva-finish">🚀 우주선 타기</button>
    `;
    resultEl.querySelector('#eva-finish').addEventListener('click', () => handlers.onFinish());
  }

  return {
    update,
    showResult,
    setVisible(on) {
      box.hidden = !on;
      if (!on) resultEl.hidden = true;
      if (on) box.querySelector('#eva-board').hidden = false;
    },
  };
}
