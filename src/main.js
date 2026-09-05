// 프로그램 진입점
// 역할: 각 화면 구성 요소를 만들고 서로 연결한다. 계산이나 그리기는 직접 하지 않는다.
// 단계가 추가될 때마다 여기에 구성 요소 생성 코드가 한 줄씩 늘어난다.

import { createLaunchSiteSelector } from './ui/launchSiteSelector.js';

// 사용자의 현재 선택을 한곳에 모아 둔다. 뒤 단계의 구성 요소들이 이 값을 읽는다.
const state = {
  launchSite: null,   // 1단계: 선택된 발사장 객체
};

// 1단계: 발사장 선택
createLaunchSiteSelector(
  document.getElementById('launch-site-selector'),
  (site) => {
    state.launchSite = site;
  },
);
