// 목적지 천체 12개의 기초 데이터 (2단계)
// 값과 출처: docs/05_data_reference.md 3절
// 거리는 지구로부터의 평균 거리이며, 사용자 결정(D-09)에 따라 하나의 값으로 고정한다.
// 저장 단위는 m. 원 자료의 단위(km, AU, 광년)를 그대로 적고 변환 함수로 m를 만든다.

// 규칙(src/data/README.md): 이 폴더는 다른 폴더를 불러오지 않는다. 변환은 같은 폴더의 상수로만 한다.
import { ASTRONOMICAL_UNIT, LIGHT_YEAR } from './constants.js';

const kmToMeters = (km) => km * 1000;
const auToMeters = (au) => au * ASTRONOMICAL_UNIT;
const lightYearsToMeters = (ly) => ly * LIGHT_YEAR;

// 구분(category) 표시 이름과 순서
export const DESTINATION_CATEGORIES = [
  { id: 'solar', label: '태양계' },
  { id: 'nearby', label: '근처 별' },
  { id: 'galaxy', label: '은하 규모' },
  { id: 'extragalactic', label: '은하 밖' },
];

export const DESTINATIONS = [
  // ---- 태양계 ----
  { id: 'moon',    category: 'solar', name: '달',     distance: kmToMeters(384_400),
    source: 'NASA 팩트시트, 평균 지심 거리' },
  { id: 'mars',    category: 'solar', name: '화성',   distance: kmToMeters(225_000_000),
    source: 'NASA, 지구-화성 평균 거리 (개략값)' },
  { id: 'jupiter', category: 'solar', name: '목성',   distance: auToMeters(5.20),
    source: '태양-목성 평균 거리 5.20 AU를 지구 기준 평균으로 근사' },
  { id: 'saturn',  category: 'solar', name: '토성',   distance: auToMeters(9.54),
    source: '태양-토성 평균 거리 9.54 AU를 지구 기준 평균으로 근사' },
  { id: 'neptune', category: 'solar', name: '해왕성', distance: auToMeters(30.07),
    source: '태양-해왕성 평균 거리 30.07 AU를 지구 기준 평균으로 근사' },
  { id: 'sun',     category: 'solar', name: '태양',   distance: auToMeters(1),
    source: 'IAU 정의값 1 AU' },

  // ---- 근처 별 ----
  { id: 'proxima', category: 'nearby', name: '프록시마 센타우리', distance: lightYearsToMeters(4.246),
    source: 'Gaia 시차 기준' },
  { id: 'sirius',  category: 'nearby', name: '시리우스',         distance: lightYearsToMeters(8.60),
    source: 'Hipparcos 시차 기준' },
  { id: 'vega',    category: 'nearby', name: '베가',             distance: lightYearsToMeters(25.04),
    source: 'Hipparcos 시차 기준' },

  // ---- 은하 규모 ----
  { id: 'orion',           category: 'galaxy', name: '오리온 성운 (M42)',        distance: lightYearsToMeters(1_344),
    source: 'Menten 외 2007, 전파 시차' },
  { id: 'galactic-center', category: 'galaxy', name: '은하 중심 (궁수자리 A*)', distance: lightYearsToMeters(26_000),
    source: 'GRAVITY 협력단 2019 (8.18 kpc)' },

  // ---- 은하 밖 ----
  { id: 'andromeda', category: 'extragalactic', name: '안드로메다 은하 (M31)', distance: lightYearsToMeters(2_537_000),
    source: '세페이드 변광성 거리 측정' },
];

// 기본 선택값: 달
export const DEFAULT_DESTINATION_ID = 'moon';

// id로 천체를 찾는다. 없으면 undefined
export function findDestination(id) {
  return DESTINATIONS.find((d) => d.id === id);
}
