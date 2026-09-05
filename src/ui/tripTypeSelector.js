// 편도 / 왕복 선택 (4단계, D-04)

import { TRIP_TYPES } from '../physics/timeDilation.js';

const OPTIONS = [
  { value: TRIP_TYPES.ONE_WAY, label: '편도', description: '지구 → 목적지' },
  { value: TRIP_TYPES.ROUND_TRIP, label: '왕복', description: '지구 → 목적지 → 지구 (편도의 2배)' },
];

/**
 * @param {HTMLElement} container
 * @param {(tripType: string) => void} onChange
 * @returns {{ getTripType: () => string }}
 */
export function createTripTypeSelector(container, onChange) {
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = '여행 형태';

  const group = document.createElement('div');
  group.className = 'radio-group';
  group.id = 'trip-type-group';

  let current = TRIP_TYPES.ONE_WAY;

  for (const option of OPTIONS) {
    const wrapper = document.createElement('label');
    wrapper.className = 'radio-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'trip-type';
    input.value = option.value;
    input.checked = option.value === current;
    input.addEventListener('change', () => {
      if (input.checked) {
        current = option.value;
        if (typeof onChange === 'function') onChange(current);
      }
    });

    const text = document.createElement('span');
    text.innerHTML = `<strong>${option.label}</strong> <small>${option.description}</small>`;

    wrapper.appendChild(input);
    wrapper.appendChild(text);
    group.appendChild(wrapper);
  }

  container.appendChild(label);
  container.appendChild(group);

  if (typeof onChange === 'function') onChange(current);

  return { getTripType: () => current };
}
