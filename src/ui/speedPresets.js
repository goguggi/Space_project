// 속도 프리셋 버튼 6개 (3단계, D-36)
// 역할: 버튼을 누르면 속도 슬라이더를 해당 속도로 옮긴다.

import { SPEED_PRESETS } from '../data/rockets.js';

/**
 * @param {HTMLElement} container
 * @param {(speed: number) => void} onSelect  프리셋 속도(m/s)를 넘긴다
 */
export function createSpeedPresets(container, onSelect) {
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = '빠르게 고르기';

  const group = document.createElement('div');
  group.className = 'button-group';
  group.id = 'speed-presets';

  for (const preset of SPEED_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset-button';
    button.dataset.presetId = preset.id;
    button.textContent = preset.label;
    if (preset.source) {
      button.title = preset.source;
    }
    button.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(preset.speed);
      }
    });
    group.appendChild(button);
  }

  container.appendChild(label);
  container.appendChild(group);
}
