// 로그 눈금 속도 슬라이더 (3단계)
// 역할: 11.2 km/s ~ 0.99c 범위를 로그 눈금으로 조절하고, 현재 속도를 km/s와 광속 비율로 표시한다. (D-29)
// 슬라이더의 원시 값 t는 0~SLIDER_STEPS 정수이고, 속도는 v = v_min × (v_max / v_min)^(t / SLIDER_STEPS) 이다.

import { SPEED_MIN, SPEED_MAX, DEFAULT_SPEED } from '../data/rockets.js';
import {
  metersPerSecToKmPerSec,
  metersPerSecToFractionOfC,
  formatNumber,
} from '../utils/units.js';

const SLIDER_STEPS = 1000;
const LOG_RATIO = Math.log(SPEED_MAX / SPEED_MIN);

// 슬라이더 위치(0~SLIDER_STEPS) → 속도 (m/s)
function positionToSpeed(position) {
  return SPEED_MIN * Math.exp((position / SLIDER_STEPS) * LOG_RATIO);
}

// 속도 (m/s) → 슬라이더 위치. 범위를 벗어나면 잘라낸다
function speedToPosition(speed) {
  const clamped = Math.min(Math.max(speed, SPEED_MIN), SPEED_MAX);
  return Math.round((Math.log(clamped / SPEED_MIN) / LOG_RATIO) * SLIDER_STEPS);
}

/**
 * 속도를 "17.0 km/s (광속의 0.0057%)" 형태로 서식한다.
 * @param {number} speed  m/s
 */
export function formatSpeed(speed) {
  const kmps = metersPerSecToKmPerSec(speed);
  const fraction = metersPerSecToFractionOfC(speed);
  const kmText = kmps >= 10_000 ? formatNumber(kmps, 0) : formatNumber(kmps, 1);
  let percentText;
  if (fraction >= 0.01) {
    percentText = formatNumber(fraction * 100, 1);
  } else if (fraction >= 1e-4) {
    percentText = formatNumber(fraction * 100, 3);
  } else {
    percentText = (fraction * 100).toExponential(2);
  }
  return `${kmText} km/s (광속의 ${percentText}%)`;
}

/**
 * 속도 슬라이더 구성 요소를 만든다.
 * @param {HTMLElement} container
 * @param {(speed: number) => void} onChange  속도(m/s)가 바뀔 때 호출
 * @returns {{ getSpeed: () => number, setSpeed: (speed: number) => void }}
 */
export function createSpeedSlider(container, onChange) {
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = '우주선 속도 (로그 눈금: 왼쪽은 km/s 영역, 오른쪽은 광속 근처)';
  label.htmlFor = 'speed-slider';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = 'speed-slider';
  slider.className = 'field-range';
  slider.min = 0;
  slider.max = SLIDER_STEPS;
  slider.step = 1;
  slider.value = speedToPosition(DEFAULT_SPEED);

  const scale = document.createElement('div');
  scale.className = 'range-scale';
  scale.innerHTML = '<span>11.2 km/s</span><span>0.99 c</span>';

  const readout = document.createElement('div');
  readout.className = 'readout';
  readout.id = 'speed-readout';

  container.appendChild(label);
  container.appendChild(slider);
  container.appendChild(scale);
  container.appendChild(readout);

  // 현재 속도. 프리셋으로 정확한 값을 넣었을 때 슬라이더 반올림 오차를 피하려고 따로 보관한다
  let currentSpeed = DEFAULT_SPEED;

  function notify() {
    readout.textContent = formatSpeed(currentSpeed);
    if (typeof onChange === 'function') {
      onChange(currentSpeed);
    }
  }

  slider.addEventListener('input', () => {
    currentSpeed = positionToSpeed(Number(slider.value));
    notify();
  });

  notify();

  return {
    getSpeed: () => currentSpeed,
    setSpeed: (speed) => {
      currentSpeed = Math.min(Math.max(speed, SPEED_MIN), SPEED_MAX);
      slider.value = speedToPosition(currentSpeed);
      notify();
    },
  };
}
