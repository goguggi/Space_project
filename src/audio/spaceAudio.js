// 배경 음악과 효과음 (17단계 D-59, 21단계 D-89에서 곡을 다시 씀)
// 역할: 장면 분위기에 맞는 우주 배경음을 실시간으로 연주하고, 사건마다 효과음을 낸다.
//
// 저작권에 대해: 영화 음악(예: 인터스텔라 사운드트랙)은 저작권이 있어 이 저장소에 넣을 수도,
//   코드로 흉내 내어 복제할 수도 없다. 교육용이라도 마찬가지다.
//   그래서 "같은 결"의 자작 곡을 코드로 연주한다 — 파이프 오르간 지속화음, 쉬지 않고 오르내리는
//   짧은 음형(오스티나토), 그리고 시계 초침 소리. 우주·시간을 다루는 음악에서 흔히 쓰는 재료다.
//   자기 음원을 쓰고 싶으면 화면의 "🎵 내 음악" 단추로 파일을 고르면 된다(그 파일은 브라우저 안에서만
//   재생되고 저장소에는 들어가지 않는다).
//
// 곡의 구성
//   1) 오르간 지속화음: 근음·5도·옥타브를 배음 여러 개로 쌓아 교회 오르간처럼 두껍게 낸다.
//   2) 오스티나토: 8분음표로 도–솔–도–솔–레♭… 처럼 오르내리는 짧은 음형을 계속 반복한다.
//   3) 초침: 박자마다 아주 짧은 딸깍 소리. **시간 지연에 맞춰 느려진다**(setTimeDilation).
//      우주선이 빨라질수록 초침이 늘어지는 것을 귀로 듣게 하려는 장치다 (γ가 클수록 느리게).
//   4) 효과음: 엔진은 갈색 잡음, 분리·접지는 짧은 충격음, 발사는 오르간이 함께 부풀어 오른다.
//
// 브라우저 정책상 사용자가 한 번 누르기 전에는 소리를 낼 수 없다. `resume()`을 단추에서 부른다.

// 장면별 분위기
//   key   근음 (Hz)              bpm  박자 빠르기
//   organ 오르간 세기 (0~1)      figure 오스티나토 세기 (0~1)
//   steps 오스티나토 음형 (근음 대비 반음 수)
const MOODS = {
  ready: {
    key: 55.00, bpm: 56, organ: 0.20, figure: 0.00, glow: 620,
    steps: [0, 7, 12, 7],
  },
  launch: {
    key: 55.00, bpm: 100, organ: 0.30, figure: 0.55, glow: 1500,
    steps: [0, 7, 12, 7, 15, 12, 7, 12],
  },
  cruise: {
    key: 49.00, bpm: 68, organ: 0.24, figure: 0.34, glow: 1050,
    steps: [0, 7, 12, 15, 12, 7],
  },
  landing: {
    key: 43.65, bpm: 88, organ: 0.28, figure: 0.48, glow: 880,
    steps: [0, 3, 7, 10, 7, 3],
  },
  arrived: {
    key: 65.41, bpm: 54, organ: 0.22, figure: 0.18, glow: 1700,
    steps: [0, 7, 12, 16],
  },
};

// 오르간 한 음을 이루는 배음들 (배수, 세기) — 파이프 오르간의 스톱을 흉내 낸 것
const ORGAN_PARTIALS = [[1, 1], [2, 0.55], [3, 0.28], [4, 0.22], [6, 0.12], [8, 0.09]];

const semitone = (root, n) => root * (2 ** (n / 12));

/** 부드러운 잡음 버퍼 (엔진음·바람·초침 재료) */
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
 *   setTimeDilation: (gamma: number) => void,
 *   useCustomTrack: (file: File) => Promise<boolean>, clearCustomTrack: () => void,
 *   hasCustomTrack: () => boolean,
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

  const organVoices = [];      // { osc, gain, partial, degree }
  let organFilter = null;
  let organGain = null;

  let mood = MOODS.ready;
  let moodName = 'ready';
  let enabled = false;
  let beatTimer = null;
  let beatIndex = 0;
  let dilation = 1;            // γ. 클수록 초침과 음형이 느려진다

  // 사용자가 고른 음원 (있으면 자작 곡 대신 이 파일을 재생한다)
  let customAudio = null;

  // 오르간 화음의 음 (근음 기준 반음): 근음 · 5도 · 옥타브
  const CHORD = [0, 7, 12];

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

    // ---- 오르간 지속화음 ----
    organFilter = ctx.createBiquadFilter();
    organFilter.type = 'lowpass';
    organFilter.frequency.value = mood.glow;
    organFilter.Q.value = 0.6;
    organGain = ctx.createGain();
    organGain.gain.value = mood.organ;
    organFilter.connect(organGain).connect(musicGain);

    for (const degree of CHORD) {
      for (const [partial, level] of ORGAN_PARTIALS) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = semitone(mood.key, degree) * partial;
        // 아주 살짝 어긋나게 두면 파이프 여러 개가 같이 울리는 느낌이 난다
        osc.detune.value = (Math.random() - 0.5) * 7;
        const gain = ctx.createGain();
        gain.gain.value = (level * 0.16) / CHORD.length;
        // 느린 흔들림(바람 상자가 숨 쉬는 느낌)
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + Math.random() * 0.06;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = gain.gain.value * 0.35;
        lfo.connect(lfoGain).connect(gain.gain);
        lfo.start();
        osc.connect(gain).connect(organFilter);
        osc.start();
        organVoices.push({ osc, gain, partial, degree, level });
      }
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

    scheduleBeat();
  }

  /** 오스티나토 한 음 (부드러운 플럭 + 오르간 냄새) */
  function playFigureNote(freq, when, level) {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = level * 0.35;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 1.5);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const tail = pan ?? musicGain;
    if (pan) { pan.pan.value = (Math.random() - 0.5) * 0.7; pan.connect(musicGain); }
    osc.connect(gain).connect(tail);
    shimmer.connect(shimmerGain).connect(gain);
    osc.start(when);
    shimmer.start(when);
    osc.stop(when + 1.7);
    shimmer.stop(when + 1.7);
  }

  /** 시계 초침 — 아주 짧은 딸깍 */
  function playTick(when, level) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.playbackRate.value = 1.8;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    src.connect(filter).connect(gain).connect(musicGain);
    src.start(when);
    src.stop(when + 0.08);
  }

  /**
   * 박자 하나를 연주하고 다음 박자를 예약한다.
   * 박자 간격은 γ(시간 지연)에 비례해 늘어난다 — 우주선이 빨라질수록 음악도 늘어진다.
   */
  function scheduleBeat() {
    clearTimeout(beatTimer);
    if (!ctx) return;
    const slow = Math.min(Math.max(dilation, 1), 8);           // γ가 아주 커도 8배까지만 느려진다
    const interval = (60 / mood.bpm) * slow;
    if (enabled && !customAudio) {
      const when = ctx.currentTime + 0.03;
      // 초침: 두 박자에 한 번
      if (beatIndex % 2 === 0) playTick(when, 0.05);
      // 오스티나토
      if (mood.figure > 0.01) {
        const step = mood.steps[beatIndex % mood.steps.length];
        const octave = 4;
        playFigureNote(semitone(mood.key, step) * (2 ** octave), when, 0.05 * mood.figure + 0.012);
        // 가끔 한 옥타브 위를 겹쳐 넓게
        if (beatIndex % 8 === 0) {
          playFigureNote(semitone(mood.key, step) * (2 ** (octave + 1)), when + 0.01, 0.03 * mood.figure);
        }
      }
    }
    beatIndex += 1;
    beatTimer = setTimeout(scheduleBeat, interval * 1000);
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

  /** 오르간을 잠깐 크게 부풀린다 (발사·폭발 같은 큰 순간) */
  function swell(amount = 1.8, seconds = 4) {
    if (!ctx || !organGain || customAudio) return;
    const now = ctx.currentTime;
    organGain.gain.cancelScheduledValues(now);
    organGain.gain.setValueAtTime(organGain.gain.value, now);
    organGain.gain.linearRampToValueAtTime(mood.organ * amount, now + 0.6);
    organGain.gain.linearRampToValueAtTime(mood.organ, now + seconds);
  }

  return {
    async resume() {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      enabled = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.2);
      if (customAudio) customAudio.play().catch(() => {});
      scheduleBeat();
    },
    isOn: () => enabled,
    setEnabled(on) {
      if (on) { this.resume(); return; }
      enabled = false;
      if (customAudio) customAudio.pause();
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    },
    /** 장면이 바뀌면 조성과 밝기, 빠르기를 부드럽게 옮긴다 */
    setMood(name) {
      if (moodName === name) return;
      moodName = name;
      mood = MOODS[name] ?? MOODS.cruise;
      beatIndex = 0;
      if (!ctx) return;
      const now = ctx.currentTime;
      organFilter.frequency.linearRampToValueAtTime(mood.glow, now + 2.5);
      organGain.gain.cancelScheduledValues(now);
      organGain.gain.linearRampToValueAtTime(mood.organ, now + 2.5);
      for (const v of organVoices) {
        v.osc.frequency.linearRampToValueAtTime(semitone(mood.key, v.degree) * v.partial, now + 2.5);
      }
    },
    /**
     * 시간 지연에 따라 음악을 늘인다 (21단계).
     * @param {number} g  로런츠 인자 γ (1 이상)
     */
    setTimeDilation(g) {
      dilation = Number.isFinite(g) && g >= 1 ? g : 1;
    },
    /** 엔진 소리 세기 (0~1). 추력이 클수록 크고 밝아진다 */
    setEngine(level) {
      if (!ctx) return;
      const v = Math.min(Math.max(level, 0), 1);
      const now = ctx.currentTime;
      engineGain.gain.linearRampToValueAtTime(v * 0.5, now + 0.12);
      engineFilter.frequency.linearRampToValueAtTime(160 + v * 900, now + 0.12);
    },
    /**
     * 사용자가 고른 음원 파일을 배경 음악으로 쓴다 (21단계).
     * 파일은 브라우저 안에서만 재생된다. 저장소에도, 서버에도 올라가지 않는다.
     * @param {File} file
     * @returns {Promise<boolean>} 재생 가능한 파일이면 true
     */
    async useCustomTrack(file) {
      if (!file) return false;
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.55;
      try {
        await audio.play();
      } catch {
        URL.revokeObjectURL(url);
        return false;
      }
      if (customAudio) { customAudio.pause(); URL.revokeObjectURL(customAudio.src); }
      customAudio = audio;
      // 자작 곡은 조용히 물린다 (효과음은 그대로 둔다)
      if (ctx && organGain) organGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
      return true;
    },
    clearCustomTrack() {
      if (!customAudio) return;
      customAudio.pause();
      URL.revokeObjectURL(customAudio.src);
      customAudio = null;
      if (ctx && organGain) organGain.gain.linearRampToValueAtTime(mood.organ, ctx.currentTime + 1.2);
    },
    hasCustomTrack: () => Boolean(customAudio),
    /** 단 분리·접지 */
    thud() { burst({ duration: 0.45, cutoff: 260, level: 0.55 }); },
    /** 도착 알림 */
    chime() {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      [0, 7, 12, 19].forEach((step, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = semitone(mood.key, step) * 8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.13);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.13 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.13 + 2.2);
        osc.connect(gain).connect(musicGain);
        osc.start(now + i * 0.13);
        osc.stop(now + i * 0.13 + 2.4);
      });
    },
    /** 발사 순간의 큰 울림 — 굉음과 함께 오르간이 부풀어 오른다 */
    boom() {
      burst({ duration: 2.6, cutoff: 180, level: 0.85 });
      swell(2.1, 5);
    },
  };
}
