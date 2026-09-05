// 배경 음악과 효과음 (17단계, D-59)
// 역할: 장면 분위기에 맞는 우주 앰비언트를 실시간으로 만들어 연주하고, 사건마다 효과음을 낸다.
//
// 왜 코드로 만드는가: 저장소에 기성곡 음원을 넣을 수 없고(저작권), 외부 자산도 쓰지 않는다(저장소 원칙).
//   Web Audio API의 오실레이터와 잡음만으로 만들면 파일이 필요 없고 `열기.html`(오프라인)에서도 그대로 울린다.
//
// 음악 구성 (KSP의 잔잔한 우주 배경음과 비슷한 결):
//   - 낮은 지속음(드론) 두 겹: 근음과 5도. 아주 느리게 흔들려(디튠) 넓게 퍼지는 느낌을 낸다.
//   - 그 위에 5음 음계(펜타토닉)에서 고른 음을 불규칙한 간격으로 하나씩 띄운다. 종소리 같은 감쇠.
//   - 장면이 바뀌면 조성(근음)과 밝기(필터), 음이 뜨는 빈도가 바뀐다.
// 효과음: 엔진은 잡음을 저역 통과로 거른 지속음, 분리·접지는 짧은 충격음.
//
// 브라우저 정책상 사용자가 한 번 누르기 전에는 소리를 낼 수 없다. `resume()`을 버튼에서 부른다.

// 장면별 분위기. root는 근음(Hz), scale은 근음 대비 반음 수, glow는 필터 밝기(Hz)
const MOODS = {
  ready:   { root: 55.00, scale: [0, 3, 5, 7, 10], glow: 700,  density: 0.20, drone: 0.16 },
  launch:  { root: 65.41, scale: [0, 2, 5, 7, 9],  glow: 1500, density: 0.55, drone: 0.24 },
  cruise:  { root: 49.00, scale: [0, 2, 5, 7, 11], glow: 1100, density: 0.34, drone: 0.20 },
  landing: { root: 43.65, scale: [0, 3, 7, 10, 14], glow: 900, density: 0.42, drone: 0.22 },
  arrived: { root: 65.41, scale: [0, 4, 7, 11, 14], glow: 1800, density: 0.28, drone: 0.18 },
};

const semitone = (root, n) => root * (2 ** (n / 12));

/** 부드러운 잡음 버퍼 (엔진음·바람 재료) */
function makeNoiseBuffer(ctx, seconds = 2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;    // 갈색 잡음에 가깝게 (저역이 강해 엔진 소리에 알맞다)
    data[i] = last * 3.2;
  }
  return buffer;
}

/**
 * @returns {{
 *   resume: () => Promise<void>, isOn: () => boolean, setEnabled: (on: boolean) => void,
 *   setMood: (name: string) => void, setEngine: (level: number) => void,
 *   thud: () => void, chime: () => void, boom: () => void,
 * }}
 */
export function createSpaceAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let noiseBuffer = null;
  let engineSource = null;
  let engineGain = null;
  let engineFilter = null;
  const drones = [];
  let mood = MOODS.ready;
  let moodName = 'ready';
  let enabled = false;
  let sparkleTimer = null;

  function ensure() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.9;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);

    noiseBuffer = makeNoiseBuffer(ctx);

    // ---- 지속음(드론) 두 겹 ----
    for (const [index, ratio] of [1, 1.5].entries()) {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = mood.root * ratio;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = mood.glow;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = mood.drone * (index === 0 ? 1 : 0.6);
      // 아주 느린 흔들림(LFO)으로 살아 있는 소리를 만든다
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + index * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.2 + index;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start();
      osc.connect(filter).connect(gain).connect(musicGain);
      osc.start();
      drones.push({ osc, filter, gain, ratio, base: index === 0 ? 1 : 0.6 });
    }

    // ---- 엔진 지속음 (잡음 → 저역 통과) ----
    engineSource = ctx.createBufferSource();
    engineSource.buffer = noiseBuffer;
    engineSource.loop = true;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 220;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineSource.connect(engineFilter).connect(engineGain).connect(sfxGain);
    engineSource.start();

    scheduleSparkle();
  }

  /** 펜타토닉에서 음 하나를 골라 종소리처럼 울린다 */
  function sparkle() {
    if (!ctx || !enabled) return;
    const step = mood.scale[Math.floor(Math.random() * mood.scale.length)];
    const octave = 3 + Math.floor(Math.random() * 3);   // 근음의 3~5옥타브 위
    const freq = semitone(mood.root, step) * (2 ** octave);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const peak = 0.05 + Math.random() * 0.05;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    // 살짝 좌우로 벌려 넓게 들리게
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.6 - 0.8;
      osc.connect(gain).connect(pan).connect(musicGain);
    } else {
      osc.connect(gain).connect(musicGain);
    }
    osc.start(now);
    osc.stop(now + 3.6);
  }

  function scheduleSparkle() {
    clearTimeout(sparkleTimer);
    const wait = (0.9 + Math.random() * 3.2) / Math.max(mood.density, 0.05) * 400;
    sparkleTimer = setTimeout(() => { sparkle(); scheduleSparkle(); }, wait);
  }

  /** 짧은 충격음 (분리·접지). 잡음을 순간적으로 열었다 닫는다 */
  function burst({ duration = 0.5, cutoff = 400, level = 0.5 } = {}) {
    if (!ctx || !enabled) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(sfxGain);
    src.start(now);
    src.stop(now + duration);
  }

  return {
    async resume() {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      enabled = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
      scheduleSparkle();
    },
    isOn: () => enabled,
    setEnabled(on) {
      if (on) { this.resume(); return; }
      enabled = false;
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    },
    /** 장면이 바뀌면 조성과 밝기를 부드럽게 옮긴다 */
    setMood(name) {
      if (moodName === name) return;
      moodName = name;
      mood = MOODS[name] ?? MOODS.cruise;
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const d of drones) {
        d.osc.frequency.linearRampToValueAtTime(mood.root * d.ratio, now + 2.5);
        d.filter.frequency.linearRampToValueAtTime(mood.glow, now + 2.5);
        d.gain.gain.linearRampToValueAtTime(mood.drone * d.base, now + 2.5);
      }
    },
    /**
     * 엔진 소리 세기 (0~1). 추력이 클수록 크고 밝아진다
     */
    setEngine(level) {
      if (!ctx) return;
      const v = Math.min(Math.max(level, 0), 1);
      const now = ctx.currentTime;
      engineGain.gain.linearRampToValueAtTime(v * 0.5, now + 0.12);
      engineFilter.frequency.linearRampToValueAtTime(160 + v * 900, now + 0.12);
    },
    /** 단 분리·접지 */
    thud() { burst({ duration: 0.45, cutoff: 260, level: 0.55 }); },
    /** 도착 알림 */
    chime() {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      [0, 4, 7, 12].forEach((step, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = semitone(mood.root, step) * 8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.11);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.11 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 1.8);
        osc.connect(gain).connect(musicGain);
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 2);
      });
    },
    /** 발사 순간의 큰 울림 */
    boom() { burst({ duration: 2.2, cutoff: 180, level: 0.85 }); },
  };
}
