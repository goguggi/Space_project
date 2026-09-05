// 비교 생물 5종의 기초 데이터 (7단계)
// 값과 출처: docs/05_data_reference.md 5절, 결정 D-13, D-37, D-38
// 수명 저장 단위: 초 (1년 = 365.25일)

import { SECONDS_PER_YEAR } from './constants.js';

const DAY = 86_400;

export const ORGANISMS = [
  {
    id: 'mayfly',
    name: '하루살이',
    icon: '🪰',
    lifespan: 1 * DAY,
    lifespanLabel: '약 1일 (성충 기준)',
    ageUnit: 'hour',           // 출발 나이 입력 단위. 수명이 하루라 시간 단위가 알맞다
    source: '성충 단계 기준. 유충 단계(수개월~2년)는 제외',
  },
  {
    id: 'dog',
    name: '개',
    icon: '🐕',
    lifespan: 13 * SECONDS_PER_YEAR,
    lifespanLabel: '약 13년',
    ageUnit: 'year',
    source: '중형견 평균 수명 10~13년의 상한',
  },
  {
    id: 'human',
    name: '사람',
    icon: '🧑',
    lifespan: 80 * SECONDS_PER_YEAR,
    lifespanLabel: '약 80년',
    ageUnit: 'year',
    source: '세계 평균 약 73년, 한국 약 83년 사이의 대표값',
  },
  {
    id: 'tortoise',
    name: '갈라파고스 코끼리거북',
    icon: '🐢',
    lifespan: 150 * SECONDS_PER_YEAR,
    lifespanLabel: '약 150년',
    ageUnit: 'year',
    source: '사육 기록 최고 170년 이상, 일반적으로 100~150년',
  },
  {
    id: 'greenland-shark',
    name: '그린란드 상어',
    icon: '🦈',
    lifespan: 400 * SECONDS_PER_YEAR,
    lifespanLabel: '약 400년',
    ageUnit: 'year',
    source: 'Nielsen 외 2016 (Science), 추정 272~512년의 중앙값 근사',
  },
];

// 출발 나이 입력 단위 → 초
export const AGE_UNIT_SECONDS = {
  hour: 3_600,
  year: SECONDS_PER_YEAR,
};

export const AGE_UNIT_LABEL = {
  hour: '시간',
  year: '년',
};
