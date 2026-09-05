// 발사장 선택 메뉴와 선택한 발사장 정보 표시 (1단계)
// 역할: 발사장 목록을 <select>로 보여주고, 선택이 바뀌면 정보를 갱신하며 콜백으로 알린다.
// 계산은 하지 않는다. 데이터는 data/launchSites.js에서만 가져온다.

import { LAUNCH_SITES, DEFAULT_LAUNCH_SITE_ID, findLaunchSite } from '../data/launchSites.js';
import { formatLatitude, formatLongitude } from '../utils/formatCoordinate.js';

/**
 * 발사장 선택 구성 요소를 만든다.
 * @param {HTMLElement} container  구성 요소를 넣을 요소
 * @param {(site: object) => void} onChange  선택이 바뀔 때 호출. 선택된 발사장 객체를 넘긴다
 * @returns {{ getSelected: () => object }}  현재 선택된 발사장을 돌려주는 함수
 */
export function createLaunchSiteSelector(container, onChange) {
  // 선택 메뉴
  const label = document.createElement('label');
  label.className = 'field-label';
  label.textContent = '발사장을 선택하세요';
  label.htmlFor = 'launch-site-select';

  const select = document.createElement('select');
  select.id = 'launch-site-select';
  select.className = 'field-select';

  for (const site of LAUNCH_SITES) {
    const option = document.createElement('option');
    option.value = site.id;
    option.textContent = `${site.name} (${site.country})`;
    select.appendChild(option);
  }
  select.value = DEFAULT_LAUNCH_SITE_ID;

  // 선택한 발사장 정보 표시 영역
  const info = document.createElement('dl');
  info.className = 'info-list';
  info.id = 'launch-site-info';

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(info);

  // 정보 영역을 현재 선택으로 다시 그린다
  function render() {
    const site = findLaunchSite(select.value);
    info.innerHTML = '';
    const rows = [
      ['이름', site.name],
      ['국가', site.country],
      ['위도', formatLatitude(site.latitude)],
      ['경도', formatLongitude(site.longitude)],
      ['비고', site.note],
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
      onChange(site);
    }
  }

  select.addEventListener('change', render);
  render();

  return {
    getSelected: () => findLaunchSite(select.value),
  };
}
