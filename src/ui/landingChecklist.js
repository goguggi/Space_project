// 착륙 절차 체크리스트 (18단계, D-67) — KSP처럼 사용자가 직접 수행한다
// 역할: 지금 할 수 있는 절차를 강조해 보여주고, 버튼이나 단축키로 수행을 받는다.
// 판정과 등급 계산은 physics/landingMission.js가 한다.

import { SURFACE_STEPS, landingGrade } from '../physics/landingMission.js';

/**
 * @param {HTMLElement} container
 * @param {{ onStep: (id: string) => void, onAuto: () => void, onRetry?: () => void }} handlers
 * @returns {object}
 */
export function createLandingChecklist(container, handlers) {
  const box = document.createElement('div');
  box.className = 'checklist';
  box.hidden = true;
  box.innerHTML = `
    <div class="checklist-head">
      <span>착륙 절차</span>
      <button type="button" class="checklist-auto" id="checklist-auto">자동 수행</button>
    </div>
    <ul class="checklist-items" id="checklist-items"></ul>
    <div class="checklist-result" id="checklist-result" hidden></div>
  `;
  container.appendChild(box);

  const listEl = box.querySelector('#checklist-items');
  const result = box.querySelector('#checklist-result');
  box.querySelector('#checklist-auto').addEventListener('click', () => handlers.onAuto());

  const rows = new Map();
  let steps = SURFACE_STEPS;

  /** 천체에 맞는 절차 목록으로 다시 만든다 (지구 재진입은 절차가 다르다) */
  function setSteps(list) {
    steps = list;
    rows.clear();
    listEl.innerHTML = '';
    buildRows();
  }

  function buildRows() {
  for (const step of steps) {
    const li = document.createElement('li');
    li.className = 'checklist-item';
    li.innerHTML = `
      <button type="button" class="checklist-key" data-step="${step.id}">${step.key}</button>
      <span class="checklist-label">${step.label}</span>
      <span class="checklist-state">대기</span>
    `;
    li.title = step.hint;
    li.querySelector('button').addEventListener('click', () => handlers.onStep(step.id));
    listEl.appendChild(li);
    rows.set(step.id, { li, state: li.querySelector('.checklist-state') });
  }
  }
  buildRows();

  // 단축키 (입력칸에 글자를 치는 중에는 무시)
  window.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const step = steps.find((s) => s.key.toLowerCase() === e.key.toLowerCase());
    if (step) { e.preventDefault(); handlers.onStep(step.id); }
  });

  /**
   * @param {{ done: object, active: object | null, missed: Array, altitude: number }} s
   */
  function update(s) {
    for (const step of steps) {
      const row = rows.get(step.id);
      if (!row) continue;
      const isDone = Boolean(s.done[step.id]);
      const isActive = s.active?.id === step.id;
      const isMissed = s.missed.some((m) => m.id === step.id);
      row.li.classList.toggle('done', isDone);
      row.li.classList.toggle('active', isActive);
      row.li.classList.toggle('missed', isMissed);
      row.state.textContent = isDone ? '완료' : isMissed ? '놓침' : isActive ? '지금!' : '대기';
    }
  }

  /** 접지 후 등급을 보여준다 */
  function showResult(done, touchdownSpeed, aim) {
    const g = landingGrade(done, touchdownSpeed, steps);
    const total = Math.min(100, g.score + (aim?.bonus ?? 0));
    result.hidden = false;
    result.className = `checklist-result grade-${g.grade}`;
    result.innerHTML = `
      <div class="grade-badge">${g.grade}</div>
      <div>
        <b>${total}점</b> <small>(절차·접지 ${g.score} + 조준 ${aim?.bonus ?? 0})</small>
        <div class="grade-notes">${g.notes.length ? g.notes.join(' · ') : '완벽한 착륙'}</div>
      </div>
    `;
    return { ...g, total };
  }

  /** 착륙 실패 (20단계, D-75) */
  function showCrash(reason) {
    result.hidden = false;
    result.className = 'checklist-result grade-crash';
    result.innerHTML = `
      <div class="grade-badge">💥</div>
      <div>
        <b>착륙 실패</b>
        <div class="grade-notes">${reason}</div>
        <button type="button" class="checklist-auto" id="checklist-retry">다시 시도</button>
      </div>
    `;
    result.querySelector('#checklist-retry').addEventListener('click', () => handlers.onRetry?.());
  }

  return {
    setSteps,
    update,
    showResult,
    showCrash,
    setVisible(on) { box.hidden = !on; if (!on) result.hidden = true; },
    clearResult() { result.hidden = true; },
  };
}
