// 임무 조작 막대 (15단계)
// 역할: 화면 아래에서 임무 전체를 조작한다. 발사, 재생/일시정지, 진행 슬라이더(직접 끌기), 배속, 건너뛰기, 처음으로.
// 계산은 하지 않는다. 조작을 handlers로 알리고, main.js의 임무 시계가 상태를 되돌려 준다.
//
// 진행 슬라이더는 항행 구간(우주선 출발 → 도착)의 진행률이다. 끌면 그 시점으로 바로 이동하고
// 3D 장면·스톱워치·막대 그래프·생존 표가 함께 움직인다 (D-55).

export const MISSION_TIME_SCALES = [0.5, 1, 2, 5, 10];

const PHASE_LABELS = {
  ready: '발사 대기',
  launch: '발사 진행 중',
  cruise: '항행 중',
  landing: '천체 착륙 중',
  reentry: '지구 재진입 중',
  eva: '지표 탐사 중',
  crashed: '착륙 실패',
  liftoff: '이륙 중',
  arrived: '도착',
};

/**
 * @param {HTMLElement} container
 * @param {{
 *   onLaunch: () => void, onReset: () => void, onTogglePlay: () => void,
 *   onScrub: (progress: number) => void, onTimeScale: (n: number) => void, onSkip: () => void,
 * }} handlers
 */
export function createMissionBar(container, handlers) {
  const bar = document.createElement('div');
  bar.className = 'mission-bar';
  bar.innerHTML = `
    <div class="mission-left">
      <button type="button" class="mission-primary" id="mission-launch">🚀 발사</button>
      <button type="button" class="mission-ghost" id="mission-play" hidden>❚❚</button>
      <button type="button" class="mission-ghost" id="mission-reset">처음으로</button>
    </div>
    <div class="mission-center">
      <div class="mission-phase" id="mission-phase">발사 대기</div>
      <input type="range" id="mission-scrub" class="mission-scrub" min="0" max="1000" step="1" value="0"
             aria-label="항행 진행률">
      <div class="mission-ticks"><span id="mission-start">출발</span><span id="mission-percent">0%</span><span id="mission-end">도착</span></div>
    </div>
    <div class="mission-right">
      <span class="mission-label">배속</span>
      <span class="button-group compact" id="mission-scales"></span>
      <button type="button" class="mission-ghost" id="mission-skip">건너뛰기</button>
    </div>
  `;
  container.appendChild(bar);

  const el = (id) => bar.querySelector(`#${id}`);
  const scrub = el('mission-scrub');
  const scaleButtons = new Map();

  for (const n of MISSION_TIME_SCALES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset-button';
    b.textContent = `${n}배`;
    b.addEventListener('click', () => handlers.onTimeScale(n));
    el('mission-scales').appendChild(b);
    scaleButtons.set(n, b);
  }

  el('mission-launch').addEventListener('click', () => handlers.onLaunch());
  el('mission-reset').addEventListener('click', () => handlers.onReset());
  el('mission-play').addEventListener('click', () => handlers.onTogglePlay());
  el('mission-skip').addEventListener('click', () => handlers.onSkip());
  scrub.addEventListener('input', () => handlers.onScrub(Number(scrub.value) / 1000));

  return {
    /**
     * @param {{ phase: string, progress: number, playing: boolean, timeScale: number, ready: boolean }} s
     */
    update(s) {
      el('mission-phase').textContent = PHASE_LABELS[s.phase] ?? s.phase;
      el('mission-percent').textContent = `${Math.round(s.progress * 100)}%`;
      el('mission-start').textContent = s.fromLabel ?? '출발';
      el('mission-end').textContent = s.toLabel ?? '도착';
      // 사용자가 슬라이더를 끄는 중에는 값을 덮어쓰지 않는다
      if (document.activeElement !== scrub) scrub.value = String(Math.round(s.progress * 1000));
      scrub.style.setProperty('--fill', `${s.progress * 100}%`);

      const launch = el('mission-launch');
      launch.disabled = !s.ready || s.phase !== 'ready';
      launch.textContent = s.phase === 'ready'
        ? (s.startsAtLaunch ? '🚀 발사' : `▶ ${s.startLabel ?? '선택 구간'}부터`)
        : s.phase === 'launch' ? '발사 중…'
        : s.phase === 'cruise' ? '항행 중…'
        : s.phase === 'landing' ? '착륙 중…'
        : s.phase === 'reentry' ? '재진입 중…'
        : s.phase === 'eva' ? '탐사 중…'
        : s.phase === 'crashed' ? '실패'
        : s.phase === 'liftoff' ? '이륙 중…' : '도착';

      const play = el('mission-play');
      play.hidden = s.phase !== 'cruise' && s.phase !== 'arrived';
      // 착륙 연출 중에는 진행 슬라이더를 잠근다 (임무 시계가 멈춰 있다)
      scrub.disabled = ['landing', 'reentry', 'launch', 'eva', 'crashed', 'liftoff'].includes(s.phase);
      play.textContent = s.playing ? '❚❚' : '▶';
      play.title = s.playing ? '일시정지' : '재생';

      el('mission-skip').disabled = s.phase === 'ready' || s.phase === 'arrived';
      for (const [n, b] of scaleButtons) b.classList.toggle('active', s.timeScale === n);
    },
  };
}
