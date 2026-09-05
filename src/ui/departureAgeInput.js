// 생물별 출발 시점 나이 입력 (7단계, D-33)
// 역할: 생물마다 출발할 때의 나이를 입력받는다. 기본값 0. 값이 바뀌면 콜백으로 알린다.
// 단위는 생물마다 다르다 (하루살이: 시간, 나머지: 년). 콜백에는 초 단위로 변환해 넘긴다.

import { ORGANISMS, AGE_UNIT_SECONDS, AGE_UNIT_LABEL } from '../data/organisms.js';

/**
 * @param {HTMLElement} container
 * @param {(ages: Record<string, number>) => void} onChange  생물 id → 출발 나이(초)
 * @returns {{ getAges: () => Record<string, number> }}
 */
export function createDepartureAgeInput(container, onChange) {
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = '출발할 때의 나이 (기본값 0 = 출발 시점에 갓 태어남)';

  const grid = document.createElement('div');
  grid.className = 'age-grid';
  grid.id = 'departure-age-grid';

  const ages = {};   // id → 초

  for (const organism of ORGANISMS) {
    ages[organism.id] = 0;

    const row = document.createElement('label');
    row.className = 'age-row';

    const name = document.createElement('span');
    name.className = 'age-name';
    name.textContent = `${organism.icon} ${organism.name}`;

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'age-input';
    input.min = 0;
    input.step = organism.ageUnit === 'hour' ? 1 : 1;
    input.value = 0;
    input.dataset.organismId = organism.id;

    const unit = document.createElement('span');
    unit.className = 'age-unit';
    unit.textContent = AGE_UNIT_LABEL[organism.ageUnit];

    input.addEventListener('input', () => {
      const value = Math.max(0, Number(input.value) || 0);
      ages[organism.id] = value * AGE_UNIT_SECONDS[organism.ageUnit];
      if (typeof onChange === 'function') onChange({ ...ages });
    });

    row.appendChild(name);
    row.appendChild(input);
    row.appendChild(unit);
    grid.appendChild(row);
  }

  container.appendChild(label);
  container.appendChild(grid);

  if (typeof onChange === 'function') onChange({ ...ages });

  return { getAges: () => ({ ...ages }) };
}
