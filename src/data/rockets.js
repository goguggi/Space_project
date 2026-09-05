// 속도 슬라이더의 범위와 프리셋 (3단계)
// 값과 출처: docs/05_data_reference.md 4절, 결정 D-10, D-11, D-36
// 단위: m/s

import { SPEED_OF_LIGHT } from './constants.js';

// 슬라이더 하한: 팔콘 헤비 지구 탈출 속도 약 11.2 km/s
// (지구 표면 탈출 속도 11.186 km/s. 팔콘 헤비는 2018년 2월 시험 발사에서 지구 탈출 궤도에 도달)
export const SPEED_MIN = 11_200;

// 슬라이더 상한: 광속의 99%
export const SPEED_MAX = 0.99 * SPEED_OF_LIGHT;

// 프리셋 버튼 6개. 누르면 슬라이더가 이 속도로 이동한다.
export const SPEED_PRESETS = [
  { id: 'voyager1', label: '보이저 1호',    speed: 17_000,                 source: 'NASA JPL, 태양 기준 속도 약 17 km/s' },
  { id: 'parker',   label: '파커 탐사선',   speed: 190_000,                source: 'NASA, 2024년 근일점 최고 속도 약 190 km/s' },
  { id: 'c10',      label: '광속의 10%',    speed: 0.10 * SPEED_OF_LIGHT,  source: '' },
  { id: 'c50',      label: '광속의 50%',    speed: 0.50 * SPEED_OF_LIGHT,  source: '' },
  { id: 'c90',      label: '광속의 90%',    speed: 0.90 * SPEED_OF_LIGHT,  source: '' },
  { id: 'c99',      label: '광속의 99%',    speed: SPEED_MAX,              source: '슬라이더 상한과 동일' },
];

// 기본 속도: 슬라이더 하한
export const DEFAULT_SPEED = SPEED_MIN;
