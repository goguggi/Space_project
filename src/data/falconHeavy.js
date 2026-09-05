// 팔콘 헤비 기본 로켓 제원 (11단계, D-22, D-43)
// 값과 출처: docs/05_data_reference.md 6절 (모두 개략값)
// 형식: 로켓 제원 JSON 계약(docs/08_rocket_design_handoff.md 6절)의 stages[] / geometry / payloadMassKg 와 동일.
//       16단계에서 설계 프로그램이 내보낸 JSON으로 그대로 바꿔 끼울 수 있게 하기 위함이다.
// 단위: kg, N, s, m

export const FALCON_HEAVY = {
  formatVersion: 1,
  name: '팔콘 헤비 (기본)',
  payloadMassKg: 10_000,
  stages: [
    {
      id: 'booster-left',
      label: '측면 부스터 (좌)',
      role: 'parallel',
      separationOrder: 1,
      dryMassKg: 22_200,
      propellantMassKg: 411_000,
      engines: { count: 9, thrustSeaLevelN: 845_000, thrustVacuumN: 914_000, ispSeaLevelS: 282, ispVacuumS: 311 },
      recovery: { enabled: true, target: 'launch_site', reservePropellantFraction: 0.05 },
    },
    {
      id: 'booster-right',
      label: '측면 부스터 (우)',
      role: 'parallel',
      separationOrder: 1,
      dryMassKg: 22_200,
      propellantMassKg: 411_000,
      engines: { count: 9, thrustSeaLevelN: 845_000, thrustVacuumN: 914_000, ispSeaLevelS: 282, ispVacuumS: 311 },
      recovery: { enabled: true, target: 'launch_site', reservePropellantFraction: 0.05 },
    },
    {
      id: 'core',
      label: '중앙 코어',
      role: 'serial',
      separationOrder: 2,
      dryMassKg: 22_200,
      propellantMassKg: 411_000,
      engines: { count: 9, thrustSeaLevelN: 845_000, thrustVacuumN: 914_000, ispSeaLevelS: 282, ispVacuumS: 311 },
      throttleWhileBoosters: 0.6,   // 부스터가 붙어 있는 동안 추력을 낮춰 연료를 아낀다
      recovery: { enabled: true, target: 'drone_ship', reservePropellantFraction: 0.05 },
    },
    {
      id: 'upper',
      label: '2단',
      role: 'serial',
      separationOrder: 3,
      dryMassKg: 4_000,
      propellantMassKg: 111_000,
      engines: { count: 1, thrustSeaLevelN: 0, thrustVacuumN: 981_000, ispSeaLevelS: 0, ispVacuumS: 348 },
      recovery: { enabled: false },
    },
  ],
  // 3D 표시용 형상. 위치는 발사대 바닥 중심 기준(m), size는 [지름, 높이, 지름]
  geometry: {
    parts: [
      { partId: 'booster-left-body',  type: 'tank',    stageId: 'booster-left',  position: [-3.7, 21, 0], rotation: [0, 0, 0], size: [3.7, 42, 3.7] },
      { partId: 'booster-left-nose',  type: 'fairing', stageId: 'booster-left',  position: [-3.7, 44, 0], rotation: [0, 0, 0], size: [3.7, 4, 3.7] },
      { partId: 'booster-right-body', type: 'tank',    stageId: 'booster-right', position: [3.7, 21, 0],  rotation: [0, 0, 0], size: [3.7, 42, 3.7] },
      { partId: 'booster-right-nose', type: 'fairing', stageId: 'booster-right', position: [3.7, 44, 0],  rotation: [0, 0, 0], size: [3.7, 4, 3.7] },
      { partId: 'core-body',          type: 'tank',    stageId: 'core',          position: [0, 21, 0],    rotation: [0, 0, 0], size: [3.7, 42, 3.7] },
      { partId: 'upper-body',         type: 'tank',    stageId: 'upper',         position: [0, 49, 0],    rotation: [0, 0, 0], size: [3.7, 14, 3.7] },
      { partId: 'fairing',            type: 'fairing', stageId: 'payload',       position: [0, 62.5, 0],  rotation: [0, 0, 0], size: [5.2, 13, 5.2] },
    ],
  },
};
