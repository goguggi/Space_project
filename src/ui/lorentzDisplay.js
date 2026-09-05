// 로런츠 인자(γ) 표시 전용 슬라이더 (3단계, D-30)
// 역할: 속도에 대응하는 γ를 슬라이더 위치와 숫자로 보여준다. 사용자가 직접 움직일 수는 없다.
// 슬라이더 눈금은 선형(γ = 1 ~ γ_max). 광속의 절반까지는 거의 왼쪽 끝에 머무는데,
// 이것이 "시간 지연은 광속에 아주 가까워져야 커진다"는 사실을 그대로 보여준다.

import { gamma, gammaMinusOne } from '../physics/lorentz.js';
import { SPEED_MAX } from '../data/rockets.js';
import { formatNumber } from '../utils/units.js';

const SLIDER_STEPS = 1000;
const GAMMA_MAX = gamma(SPEED_MAX);   // 0.99c에서 약 7.0888

/**
 * γ를 표시용 문자열로 만든다. 1에 매우 가까우면 γ − 1을 지수 표기로 함께 보여준다.
 * @param {number} speed  m/s
 */
export function formatGamma(speed) {
  const excess = gammaMinusOne(speed);
  if (excess < 1e-4) {
    return `γ = 1 + ${excess.toExponential(2)}  (거의 1)`;
  }
  return `γ = ${formatNumber(1 + excess, 4)}`;
}

/**
 * @param {HTMLElement} container
 * @returns {{ update: (speed: number) => void }}
 */
export function createLorentzDisplay(container) {
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = '로런츠 인자 γ (표시 전용, 속도에 따라 자동으로 움직임)';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'lorentz-slider';
  slider.className = 'field-range readonly';
  slider.min = 0;
  slider.max = SLIDER_STEPS;
  slider.step = 1;
  slider.disabled = true;
  slider.tabIndex = -1;

  const scale = document.createElement('div');
  scale.className = 'range-scale';
  scale.innerHTML = `<span>γ = 1</span><span>γ = ${formatNumber(GAMMA_MAX, 2)}</span>`;

  const readout = document.createElement('div');
  readout.className = 'readout';
  readout.id = 'lorentz-readout';

  container.appendChild(label);
  container.appendChild(slider);
  container.appendChild(scale);
  container.appendChild(readout);

  function update(speed) {
    const g = gamma(speed);
    slider.value = Math.round(((g - 1) / (GAMMA_MAX - 1)) * SLIDER_STEPS);
    readout.textContent = formatGamma(speed);
  }

  return { update };
}
