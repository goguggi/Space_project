// 상승 절차 목록 (19단계, D-73)
// 역할: 발사부터 궤도 진입까지의 이정표를 늘어놓고, 누르면 그 지점까지 건너뛴다.
// 판정은 physics/ascentMission.js가 한다. 여기서는 그리기와 클릭 전달만.

import { ASCENT_STEPS } from '../physics/ascentMission.js';

/**
 * @param {HTMLElement} container
 * @param {{ onJump: (stepId: string) => void }} handlers
 * @returns {{ update: (info: object) => void, setVisible: (on: boolean) => void }}
 */
export function createAscentChecklist(container, handlers) {
  const box = document.createElement('div');
  box.className = 'checklist ascent-checklist';
  box.hidden = true;
  box.innerHTML = `
    <div class="checklist-head">
      <span>상승 절차</span>
      <span class="ascent-hint" id="ascent-hint">누르면 그 지점까지 건너뜁니다</span>
    </div>
    <ul class="checklist-items" id="ascent-items"></ul>
  `;
  container.appendChild(box);

  const listEl = box.querySelector('#ascent-items');
  const hintEl = box.querySelector('#ascent-hint');
  const rows = new Map();

  for (const step of ASCENT_STEPS) {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <button type="button" class="checklist-key" data-step="${step.id}">${step.key}</button>
      <span class="checklist-label">${step.label}</span>
      <span class="checklist-state">대기</span>
    `;
    li.title = step.hint;
    li.querySelector('button').addEventListener('click', () => handlers.onJump(step.id));
    li.querySelector('.checklist-label').addEventListener('click', () => handlers.onJump(step.id));
    listEl.appendChild(li);
    rows.set(step.id, { li, state: li.querySelector('.checklist-state') });
  }

  // 숫자키 1~7로도 건너뛴다
  window.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const step = ASCENT_STEPS.find((s) => s.key === e.key);
    if (step) { e.preventDefault(); handlers.onJump(step.id); }
  });

  /**
   * @param {{ done: Record<string, boolean>, next: object | null }} info
   */
  function update(info) {
    for (const step of ASCENT_STEPS) {
      const row = rows.get(step.id);
      const isDone = Boolean(info.done[step.id]);
      const isNext = info.next?.id === step.id;
      row.li.classList.toggle('done', isDone);
      row.li.classList.toggle('active', isNext);
      row.state.textContent = isDone ? '완료' : isNext ? '다음' : '대기';
    }
    hintEl.textContent = info.next ? `${info.next.hint}` : '궤도 진입 완료';
  }

  return {
    update,
    setVisible(on) { box.hidden = !on; },
  };
}
