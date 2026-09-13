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
 * @param {{
 *   onView: (id: string) => void, onSound: (on: boolean) => void,
 *   onMusicFile?: (file: File | null) => void,
 * }} handlers
 * @returns {{ setView: (id: string) => void, setSound: (on: boolean) => void, setMusicName: (name: string) => void }}
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

  // ---- 내 음악 넣기 (21단계, D-89) ----
  // 배경 음악은 저작권 때문에 저장소에 기성곡을 넣지 않고 코드로 연주한다.
  // 대신 발표 때 쓰고 싶은 음원이 있으면 여기서 골라 틀 수 있다. 파일은 브라우저 안에서만 재생된다.
  const musicInput = document.createElement('input');
  musicInput.type = 'file';
  musicInput.accept = 'audio/*';
  musicInput.hidden = true;
  const music = document.createElement('button');
  music.type = 'button';
  music.className = 'view-button music-button';
  music.textContent = '🎵 내 음악';
  music.title = '가지고 있는 음원 파일을 배경 음악으로 틉니다 (한 번 더 누르면 기본 곡으로 돌아갑니다)';
  let musicOn = false;
  music.addEventListener('click', () => {
    if (musicOn) { handlers.onMusicFile?.(null); setMusicName(''); return; }
    musicInput.click();
  });
  musicInput.addEventListener('change', () => {
    const file = musicInput.files?.[0];
    if (file) handlers.onMusicFile?.(file);
  });
  box.appendChild(music);
  box.appendChild(musicInput);

  container.appendChild(box);

  function setView(id) {
    for (const [key, b] of buttons) b.classList.toggle('active', key === id);
  }

  function setSound(on) {
    soundOn = on;
    sound.textContent = on ? '🔊 소리 끄기' : '🔈 소리 켜기';
    sound.classList.toggle('active', on);
  }

  /** 고른 음원 이름을 단추에 보여 준다. 빈 문자열이면 기본 곡으로 돌아간 것 */
  function setMusicName(name) {
    musicOn = Boolean(name);
    music.textContent = musicOn ? `🎵 ${name.length > 14 ? `${name.slice(0, 13)}…` : name}` : '🎵 내 음악';
    music.classList.toggle('active', musicOn);
    if (!musicOn) musicInput.value = '';
  }

  // 숫자키 단축키. 입력칸에 글자를 치는 중에는 무시한다
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const index = ['1', '2', '3'].indexOf(e.key);
    if (index >= 0) handlers.onView(VIEW_MODES[index].id);
  });

  setView('third');
  return { setView, setSound, setMusicName };
}
