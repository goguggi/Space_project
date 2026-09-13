// 임무 구간 칩 (18단계, D-65)
// 역할: 진행 바 위에 임무 구간을 나란히 두고, 누르면 그 장면이 바로 재생되게 한다.
// 계산은 physics/missionTimeline.js가 한다. 여기서는 그리기와 클릭 전달만 한다.

/**
 * @param {HTMLElement} container
 * @param {{ onSelect: (chapterId: string) => void, onPick: (chapterId: string) => void }} handlers
 *   onSelect: 칩 본문을 눌렀을 때 — 그 장면을 바로 재생한다
 *   onPick:   체크 상자를 눌렀을 때 — 그 구간을 "시작 지점"으로 정한다 (20단계)
 * @returns {object}
 */
export function createMissionChapters(container, handlers) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  container.appendChild(row);

  const buttons = new Map();
  const boxes = new Map();
  let picked = 'launch';   // 시작 지점 (기본은 발사)

  function setChapters(list) {
    row.innerHTML = '';
    buttons.clear();
    boxes.clear();
    for (const chapter of list) {
      const chip = document.createElement('span');
      chip.className = 'chapter-chip';
      if (!chapter.enabled) chip.classList.add('disabled');
      chip.title = chapter.hint;

      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'chapter-check';
      box.title = '여기를 시작 지점으로';
      box.textContent = '○';
      box.disabled = !chapter.enabled;
      box.addEventListener('click', (e) => { e.stopPropagation(); pick(chapter.id); handlers.onPick(chapter.id); });

      const label = document.createElement('button');
      label.type = 'button';
      label.className = 'chapter-label';
      label.textContent = chapter.label;
      label.disabled = !chapter.enabled;
      label.addEventListener('click', () => handlers.onSelect(chapter.id));

      chip.appendChild(box);
      chip.appendChild(label);
      row.appendChild(chip);
      buttons.set(chapter.id, chip);
      boxes.set(chapter.id, box);
    }
    if (!boxes.has(picked)) picked = 'launch';
    pick(picked);
  }

  /** 시작 지점 표시를 바꾼다 */
  function pick(id) {
    picked = id;
    for (const [key, box] of boxes) {
      const on = key === id;
      box.textContent = on ? '●' : '○';
      box.classList.toggle('picked', on);
      buttons.get(key)?.classList.toggle('picked', on);
    }
  }

  function setCurrent(id) {
    for (const [key, chip] of buttons) chip.classList.toggle('active', key === id);
  }

  return { setChapters, setCurrent, pick, get picked() { return picked; } };
}
