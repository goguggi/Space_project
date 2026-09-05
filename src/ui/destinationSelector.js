// 목적지(천체) 선택 메뉴와 거리 표시 (2단계)
// 역할: 천체 12개를 구분별로 묶은 <select>로 보여주고, 선택이 바뀌면 거리를 표시하며 콜백으로 알린다.

import {
  DESTINATIONS,
  DESTINATION_CATEGORIES,
  DEFAULT_DESTINATION_ID,
  findDestination,
} from '../data/destinations.js';
import { formatDistance, formatNumber, metersToKm } from '../utils/units.js';

/**
 * 목적지 선택 구성 요소를 만든다.
 * @param {HTMLElement} container
 * @param {(destination: object) => void} onChange  선택된 천체 객체를 넘긴다
 * @returns {{ getSelected: () => object }}
 */
export function createDestinationSelector(container, onChange) {
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = '목적지를 선택하세요';
  label.htmlFor = 'destination-select';

  const select = document.createElement('select');
  select.id = 'destination-select';
  select.className = 'field-select';

  // 구분별 <optgroup>
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
  select.value = DEFAULT_DESTINATION_ID;

  const info = document.createElement('dl');
  info.className = 'info-list';
  info.id = 'destination-info';

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(info);

  function render() {
    const destination = findDestination(select.value);
    const category = DESTINATION_CATEGORIES.find((c) => c.id === destination.category);
    info.innerHTML = '';
    const rows = [
      ['이름', destination.name],
      ['구분', category.label],
      ['평균 거리', formatDistance(destination.distance)],
      ['km 환산', `${formatNumber(metersToKm(destination.distance), 0)} km`],
      ['근거', destination.source],
    ];
    for (const [term, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = term;
      const dd = document.createElement('dd');
      dd.textContent = value;
      info.appendChild(dt);
      info.appendChild(dd);
    }
    if (typeof onChange === 'function') {
      onChange(destination);
    }
  }

  select.addEventListener('change', render);
  render();

  return {
    getSelected: () => findDestination(select.value),
  };
}
