// 착륙장과 무인선 위치, 착륙 유도 매개변수 (13단계, D-23, D-44)
// 근거: docs/05_data_reference.md 7절, docs/03_physics.md 6.5절
// 발사 평면은 2차원(진행 방향 = 다운레인지)이므로 위치는 발사대에서 진행 방향으로 잰 거리(m)로 표현한다.

export const LANDING_SITES = {
  // 측면 부스터: 발사장 근처 착륙장. 실제 케네디의 착륙 지대는 발사대에서 약 10 km 떨어져 있으나
  // 발사 평면에 "남쪽"을 표현할 수 없어, 모든 발사장에서 진행 방향 2 km 지점에 가상 착륙장을 둔다 (D-44)
  launch_site: { label: '착륙장', downrangeM: 2_000 },
  // 중앙 코어: 바다 위 무인선. 위치는 분리 시점에 코어가 탄도 비행으로 떨어질 지점으로 정한다
  // (실제로도 무인선을 코어의 예상 낙하 지점에 미리 보내 둔다). null = 계산으로 정함
  drone_ship: { label: '무인선', downrangeM: null },
};

// 착륙 유도 매개변수. 물리 법칙이 아닌 조정값이며, 착륙이 항상 성공하도록 정했다 (D-41)
export const GUIDANCE = {
  coastSeconds: 5,            // 분리 후 부스트백 시작까지 관성 비행 (s)
  boostbackMaxG: 3,           // 부스트백 최대 가속도 (g 배수)
  planDecelG: 3,              // 착륙 연소 시작 고도를 계산할 때 쓰는 계획 감속도 (g 배수). 실제 상한보다 작게 두어 여유 확보
  landingMaxG: 4,             // 착륙 연소 최대 감속도 (g 배수)
  lateralMaxG: 1.0,           // 낙하·착륙 중 수평 오차 보정 최대 가속도 (g 배수)
  alignPositionM: 10,         // 최종 접근에서 하강을 시작하기 위한 수평 위치 오차 한도 (m)
  alignSpeed: 3,              // 최종 접근에서 하강을 시작하기 위한 수평 속도 한도 (m/s)
  landingMarginM: 200,        // 착륙 연소 시작 고도 여유 (m)
  finalApproachM: 100,        // 이 고도(m) 아래에서는 부드러운 최종 접근
  finalDescentRate: 0.15,     // 최종 접근 목표 하강 속도 = 고도 × 이 값 (1/s)
  finalMinDescent: 1.5,       // 최종 접근 최소 하강 속도 (m/s)
  finalGain: 2,               // 최종 접근 속도 오차 → 가속도 이득 (1/s)
  terminalPositionTau: 15,    // 착륙 연소 중 위치 오차를 줄이는 시간 상수 (s)
  terminalVelocityTau: 4,     // 착륙 연소 중 수평 속도를 맞추는 시간 상수 (s)
  terminalMaxLateralSpeed: 120,// 착륙 연소 중 최대 수평 이동 속도 (m/s)
  touchdownAltitude: 1.5,     // 접지 판정 고도 (m)
  touchdownSpeed: 3,          // 접지 판정 속도 (m/s): 수직·수평 모두 이 이하
};
