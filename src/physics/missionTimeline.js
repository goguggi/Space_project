// 임무 구간(챕터) 계산 (18단계, D-65)
// 역할: 임무 전체를 사람이 이해하는 구간으로 나누고, 각 구간이 진행 바의 어디부터 어디까지인지 알려준다.
// 화면도 Three.js도 모르는 순수 함수. 검증은 tests/physics.test.js.
//
// 진행 바는 "항행 진행률 0~1" 하나를 쓴다. 발사·착륙처럼 항행 시계가 멈추는 구간은
// 진행률 위의 한 점(0 또는 반환점 또는 1)에 붙어 있고, 칩을 누르면 그 장면을 처음부터 재생한다.

/**
 * 임무 구간 목록을 만든다.
 * @param {{ roundTrip: boolean, landable: boolean, targetName: string }} options
 * @returns {Array<{ id, label, phase, at, enabled, hint }>}
 *   at: 그 구간이 시작될 때의 항행 진행률 (0~1)
 *   phase: 그 구간에서 들어가야 하는 임무 단계
 */
export function missionChapters({ roundTrip = false, landable = false, targetName = '목적지' } = {}) {
  const turn = roundTrip ? 0.5 : 1;
  const chapters = [
    { id: 'launch', label: '발사', phase: 'launch', at: 0, enabled: true,
      hint: '이륙 → 부스터 분리 → 코어 분리' },
    { id: 'orbit', label: '궤도 진입', phase: 'cruise', at: 0, enabled: true,
      hint: '2단 연소가 끝나고 우주선이 출발한다' },
    { id: 'outbound', label: '항행', phase: 'cruise', at: 0.02, enabled: true,
      hint: `${targetName}까지 가는 길` },
    { id: 'target', label: landable ? `${targetName} 착륙` : `${targetName} 근접`, phase: landable ? 'landing' : 'cruise',
      at: turn, enabled: true,
      hint: landable ? '지표에 내려앉는다' : '표면이 없어 곁을 스쳐 지나간다' },
    { id: 'return', label: '귀환', phase: 'cruise', at: roundTrip ? 0.52 : 1, enabled: roundTrip,
      hint: '지구로 돌아오는 길' },
    { id: 'reentry', label: '지구 재착륙', phase: 'reentry', at: 1, enabled: roundTrip,
      hint: '대기권에 다시 들어와 착륙한다' },
  ];
  return chapters;
}

/**
 * 지금 상태가 어느 구간인지 알려준다.
 * @param {Array} chapters  missionChapters 결과
 * @param {{ phase: string, progress: number, visitedTarget: boolean }} state
 * @returns {string} 구간 id
 */
export function currentChapter(chapters, { phase, progress, visitedTarget }) {
  if (phase === 'ready' || phase === 'launch') return 'launch';
  if (phase === 'landing') return 'target';
  if (phase === 'reentry') return 'reentry';
  const roundTrip = chapters.find((c) => c.id === 'return')?.enabled;
  if (phase === 'arrived') return roundTrip ? 'reentry' : 'target';
  // 항행 중
  if (progress <= 0.02) return 'orbit';
  if (roundTrip && visitedTarget) return 'return';
  const turn = roundTrip ? 0.5 : 1;
  if (progress >= turn) return 'target';
  return 'outbound';
}
