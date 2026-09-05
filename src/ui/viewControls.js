// 시점 전환과 소리 켜기 (17단계, D-58 · D-59)
// 역할: 3D 화면 오른쪽 위에 1인칭 / 3인칭 / 광역 버튼과 음소거 버튼을 둔다.
// 숫자키 1·2·3으로도 시점을 바꾼다. 계산도 그리기도 하지 않는다.

export const VIEW_MODES = [
  { id: 'first', label: '1인칭', hint: '조종석에서 본 시점 (숫자키 1)' },
  { id: 'third', label: '3인칭', hint: '우주선 뒤에서 따라가는 시점 (숫자키 2)' },
  { id: 'wide', label: '광역', hint: '지구·우주선·목적지를 한 화면에 (숫자키 3)' },
];

/**
 * @param {HTMLElement} container
 * @param {{ onView: (id: string) => void, onSound: (on: boolean) => void }} handlers
 * @returns {{ setView: (id: string) => void, setSound: (on: boolean) => void }}
 */
export function createViewControls(container, handlers) {
  const box = document.createElement('div');
  box.className = 'view-controls';

  const group = document.createElement('div');
  group.className = 'view-group';
  const buttons = new Map();
  for (const mode of VIEW_MODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'view-button';
    b.textContent = mode.label;
    b.title = mode.hint;
    b.addEventListener('click', () => handlers.onView(mode.id));
    group.appendChild(b);
    buttons.set(mode.id, b);
  }
  box.appendChild(group);

  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'view-button sound-button';
  sound.textContent = '🔈 소리 켜기';
  sound.title = '배경 음악과 효과음 (브라우저 정책상 한 번 눌러야 시작됩니다)';
  let soundOn = false;
  sound.addEventListener('click', () => {
    soundOn = !soundOn;
    handlers.onSound(soundOn);
    setSound(soundOn);
  });
  box.appendChild(sound);
  container.appendChild(box);

  function setView(id) {
    for (const [key, b] of buttons) b.classList.toggle('active', key === id);
  }

  function setSound(on) {
    soundOn = on;
    sound.textContent = on ? '🔊 소리 끄기' : '🔈 소리 켜기';
    sound.classList.toggle('active', on);
  }

  // 숫자키 단축키. 입력칸에 글자를 치는 중에는 무시한다
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const index = ['1', '2', '3'].indexOf(e.key);
    if (index >= 0) handlers.onView(VIEW_MODES[index].id);
  });

  setView('third');
  return { setView, setSound };
}
