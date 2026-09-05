// 물리 상수 (프로젝트에서 유일한 정의 위치)
// 출처: docs/05_data_reference.md 1절, docs/03_physics.md 1절과 6.1절
// 단위는 모두 SI 기본 단위 (m, s, kg)

// 진공 중 빛의 속도 (m/s). SI 정의값
export const SPEED_OF_LIGHT = 299_792_458;

// 천문단위 (m). IAU 2012 결의 B2 정의값
export const ASTRONOMICAL_UNIT = 149_597_870_700;

// 율리우스년 (s). 365.25일 × 86,400초. 시간 표시와 광년 정의에 사용
export const SECONDS_PER_YEAR = 365.25 * 86_400;

// 광년 (m). 율리우스년 동안 빛이 가는 거리
export const LIGHT_YEAR = SPEED_OF_LIGHT * SECONDS_PER_YEAR;   // = 9,460,730,472,580,800 m

// 표준 중력가속도 (m/s²). CGPM 1901. 가속 모델(8단계)과 발사 물리(11단계)에서 사용
export const STANDARD_GRAVITY = 9.80665;

// 지구 표준 중력 매개변수 GM (m³/s²). WGS 84. 발사 물리에서 사용
export const EARTH_GM = 3.986004418e14;

// 지구 평균 반지름 (m). 발사 물리에서 사용
export const EARTH_RADIUS = 6_371_000;
