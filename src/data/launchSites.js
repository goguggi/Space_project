// 발사장 5곳의 기초 데이터
// 출처와 값의 근거: docs/05_data_reference.md 2절
// 좌표는 표시 용도이며 거리 계산에는 쓰이지 않는다 (docs/03_physics.md 3.3절, P-01)
// 위도: 북위 +, 남위 -   /   경도: 동경 +, 서경 -   (단위: 도)

export const LAUNCH_SITES = [
  {
    id: 'naro',
    name: '나로우주센터',
    country: '대한민국',
    latitude: 34.43,
    longitude: 127.54,
    note: '전남 고흥군',
  },
  {
    id: 'kennedy',
    name: '케네디 우주센터 (LC-39A)',
    country: '미국',
    latitude: 28.61,
    longitude: -80.60,
    note: '플로리다',
  },
  {
    id: 'baikonur',
    name: '바이코누르 우주기지',
    country: '카자흐스탄',
    latitude: 45.97,
    longitude: 63.31,
    note: '러시아 임차',
  },
  {
    id: 'guiana',
    name: '기아나 우주센터',
    country: '프랑스령 기아나',
    latitude: 5.24,
    longitude: -52.77,
    note: '쿠루',
  },
  {
    id: 'tanegashima',
    name: '다네가시마 우주센터',
    country: '일본',
    latitude: 30.40,
    longitude: 130.97,
    note: '가고시마현',
  },
];

// 기본 선택값: 목록의 첫 번째 발사장 (나로우주센터)
export const DEFAULT_LAUNCH_SITE_ID = LAUNCH_SITES[0].id;

// id로 발사장을 찾는다. 없으면 undefined
export function findLaunchSite(id) {
  return LAUNCH_SITES.find((site) => site.id === id);
}
