// 목적지 천체의 3D 표시용 데이터 (15단계)
// 값과 출처: docs/05_data_reference.md 3절과 아래 주석. 거리는 destinations.js가 갖고, 여기는 "생김새"만 둔다.
// 규칙(src/data/README.md): 이 폴더는 다른 폴더를 불러오지 않는다.
//
// radiusM: 실제 반지름 (m). 화면에서는 항행 장면이 로그 축척으로 줄여 그린다.
//   성운·은하는 반지름이 광년 단위라 그대로 쓰면 화면을 덮어 버리므로, 표시용 반지름을 따로 둔다(displayRadiusM).
// kind: 'planet' | 'star' | 'moon' | 'nebula' | 'galaxy'  — 그리는 방법이 달라진다
// color: 대략적인 실제 색. 사진이 아닌 단색 구/원반으로 그린다 (외부 이미지 금지, 파일 동봉 원칙)

const KM = 1000;
const LY = 9.4607304725808e15;   // constants.js와 같은 값. data 폴더 안에서만 쓰는 지역 상수

export const CELESTIAL_BODIES = {
  // ---- 출발지 ----
  earth: {
    name: '지구', kind: 'planet', radiusM: 6_371 * KM,
    color: 0x2f6f4e, atmosphere: 0x4a8fe0, glow: 0,
    source: 'IAU 평균 반지름 6,371 km',
  },

  // ---- 태양계 ----
  moon: {
    name: '달', kind: 'moon', radiusM: 1_737.4 * KM,
    color: 0xb9b6ad, glow: 0,
    landable: true, surfaceGravity: 1.62,   // NASA 팩트시트
    source: 'NASA 팩트시트, 평균 반지름 1,737.4 km / 표면 중력 1.62 m/s²',
  },
  mars: {
    name: '화성', kind: 'planet', radiusM: 3_389.5 * KM,
    color: 0xc1552e, atmosphere: 0xd9a07a, glow: 0,
    landable: true, surfaceGravity: 3.72,   // NASA 팩트시트
    source: 'NASA 팩트시트, 평균 반지름 3,389.5 km / 표면 중력 3.72 m/s²',
  },
  jupiter: {
    name: '목성', kind: 'planet', radiusM: 69_911 * KM,
    color: 0xd8b48c, atmosphere: 0xe8cba8, bands: true, glow: 0,
    source: 'NASA 팩트시트, 평균 반지름 69,911 km',
  },
  saturn: {
    name: '토성', kind: 'planet', radiusM: 58_232 * KM,
    color: 0xe3d5a6, atmosphere: 0xefe4bd, bands: true, glow: 0,
    // 고리: 안쪽 74,500 km ~ 바깥쪽 140,220 km (A 고리 바깥 경계)
    ring: { innerM: 74_500 * KM, outerM: 140_220 * KM, color: 0xcfc3a0 },
    source: 'NASA 팩트시트, 평균 반지름 58,232 km / 고리 A 바깥 경계 140,220 km',
  },
  neptune: {
    name: '해왕성', kind: 'planet', radiusM: 24_622 * KM,
    color: 0x3b6fd4, atmosphere: 0x6f9df0, glow: 0,
    source: 'NASA 팩트시트, 평균 반지름 24,622 km',
  },
  sun: {
    name: '태양', kind: 'star', radiusM: 695_700 * KM,
    color: 0xfff2b0, glow: 0xffb347, glowScale: 2.6,
    source: 'IAU 공칭 태양 반지름 695,700 km',
  },

  // ---- 근처 별 ----
  proxima: {
    name: '프록시마 센타우리', kind: 'star', radiusM: 0.1542 * 695_700 * KM,
    color: 0xff7b4a, glow: 0xff5a2b, glowScale: 3.0,
    source: '반지름 0.1542 R☉ (적색왜성 M5.5Ve)',
  },
  sirius: {
    name: '시리우스', kind: 'star', radiusM: 1.711 * 695_700 * KM,
    color: 0xdbe9ff, glow: 0x9dc4ff, glowScale: 3.2,
    source: '시리우스 A 반지름 1.711 R☉ (A1V)',
  },
  vega: {
    name: '베가', kind: 'star', radiusM: 2.362 * 695_700 * KM,
    color: 0xe8f0ff, glow: 0xa8c8ff, glowScale: 3.2,
    source: '베가 평균 반지름 약 2.362 R☉ (A0V, 빠른 자전으로 편평)',
  },

  // ---- 은하 규모 ----
  orion: {
    name: '오리온 성운', kind: 'nebula', radiusM: 12 * LY,
    displayRadiusM: 4 * LY,     // 실제 지름 약 24광년. 화면에서는 앞부분만 채우도록 줄여 그린다
    color: 0xff8fb0, glow: 0x7ad0ff, glowScale: 1.8,
    source: '지름 약 24광년 (메시에 42)',
  },
  'galactic-center': {
    name: '은하 중심', kind: 'galaxy', radiusM: 300 * LY,
    displayRadiusM: 60 * LY,
    color: 0xffd9a0, glow: 0xffb35c, glowScale: 2.2,
    source: '중심 팽대부의 밝은 핵 영역을 반지름 수백 광년으로 근사',
  },

  // ---- 은하 밖 ----
  andromeda: {
    name: '안드로메다 은하', kind: 'galaxy', radiusM: 110_000 * LY,
    displayRadiusM: 20_000 * LY,
    color: 0xcfd8ff, glow: 0x8aa0ff, glowScale: 2.0,
    disk: true,
    source: '지름 약 220,000광년 (M31)',
  },
};

/**
 * 목적지 id로 표시 데이터를 얻는다. 없으면 회색 구로 대신한다.
 * @param {string} id  destinations.js의 id
 */
export function getBodyVisual(id) {
  return CELESTIAL_BODIES[id] ?? {
    name: '목적지', kind: 'planet', radiusM: 6_371 * KM, color: 0x8a8f9c, glow: 0,
  };
}

/**
 * 고체 표면이 있어 착륙 장면을 만들 수 있는 천체인가 (D-61).
 * 가스행성·항성·성운·은하는 내려앉을 표면이 없으므로 근접 통과로 처리한다.
 * @param {object} visual
 */
export function isLandable(visual) {
  return Boolean(visual?.landable);
}

/**
 * 화면에 그릴 반지름 (m). 성운·은하는 줄여 그린 값을 쓴다.
 * @param {object} visual
 */
export function displayRadius(visual) {
  return visual.displayRadiusM ?? visual.radiusM;
}
