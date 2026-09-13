// 경유지 선택 (21단계, D-95)
// 역할: 목적지로 곧장 가는 대신 다른 천체를 한 번 들렀다 가도록 고르게 한다. 계산은 하지 않는다.
//
// 경로: 지구 → (경유지) → 목적지 → (왕복이면 지구)
// 구간 거리 계산과 그 근거는 physics/route.js에 있다.

import { DESTINATIONS, DESTINATION_CATEGORIES, findDestination } from '../data/destinations.js';
import { formatDistance } from '../utils/units.js';

/**
 * @param {HTMLElement} container
 * @param {(waypoint: object|null) => void} onChange
 * @returns {{ getSelected: () => object|null, setExcluded: (id: string) => void }}
 */
export function createWaypointSelector(container, onChange) {
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = '가는 길에 들를 천체 (선택)';
  label.htmlFor = 'waypoint-select';

  const select = document.createElement('select');
  select.id = 'waypoint-select';
  select.className = 'field-select';

  const none = document.createElement('option');
  none.value = '';
  none.textContent = '들르지 않고 곧장 간다';
  select.appendChild(none);

  for (const category of DESTINATION_CATEGORIES) {
    const group = document.createElement('optgroup');
    group.label = category.label;
    for (const destination of DESTINATIONS.filter((d) => d.category === category.id)) {
      const option = document.createElement('option');
      option.value = destination.id;
      option.textContent = destination.name;
      group.appendChild(option);
    }
    select.appendChild(group);
  }

  const info = document.createElement('p');
  info.className = 'field-note';
  info.textContent = '';

  container.append(label, select, info);

  let excluded = '';

  function currentValue() {
    return select.value ? findDestination(select.value) : null;
  }

  function describe() {
    const w = currentValue();
    info.textContent = w
      ? `지구 → ${w.name} → 목적지 순으로 갑니다. ${w.name}까지 ${formatDistance(w.distance)}`
      : '';
  }

  select.addEventListener('change', () => {
    describe();
    onChange(currentValue());
  });

  return {
    getSelected: currentValue,
    /** 목적지와 같은 천체는 경유지로 고를 수 없게 한다 */
    setExcluded(id) {
      excluded = id;
      for (const option of select.querySelectorAll('option')) {
        option.disabled = Boolean(option.value) && option.value === excluded;
      }
      if (select.value === excluded) {
        select.value = '';
        describe();
        onChange(null);
      }
    },
  };
}
