// 임무 구간 칩 (18단계, D-65)
// 역할: 진행 바 위에 임무 구간을 나란히 두고, 누르면 그 장면이 바로 재생되게 한다.
// 계산은 physics/missionTimeline.js가 한다. 여기서는 그리기와 클릭 전달만 한다.

/**
 * @param {HTMLElement} container
 * @param {{ onSelect: (chapterId: string) => void }} handlers
 * @returns {{ setChapters: (list: Array) => void, setCurrent: (id: string) => void }}
 */
export function createMissionChapters(container, handlers) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  container.appendChild(row);

  const buttons = new Map();

  function setChapters(list) {
    row.innerHTML = '';
    buttons.clear();
    for (const chapter of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter-chip';
      b.textContent = chapter.label;
      b.title = chapter.hint;
      b.disabled = !chapter.enabled;
      b.addEventListener('click', () => handlers.onSelect(chapter.id));
      row.appendChild(b);
      buttons.set(chapter.id, b);
    }
  }

  function setCurrent(id) {
    for (const [key, b] of buttons) b.classList.toggle('active', key === id);
  }

  return { setChapters, setCurrent };
}
