// 시간 지연을 "얼마나 덜 늙는가"로 바꿔 주는 계산 (21단계, D-97)
// 역할: 이 프로젝트의 핵심 질문 — "그래서 얼마나 차이가 나는데?" — 에 답할 수 있는 값을 만든다.
// 화면(DOM)을 모른다. 검증은 tests/physics.test.js.
//
// 이 프로젝트가 하려는 것:
//   빛의 속도는 누가 재도 똑같다(광속 불변). 그러려면 빠르게 움직이는 쪽의 시간이 느리게 흘러야 한다.
//   그 "느리게"가 얼마인지는 γ = 1/√(1−β²) 한 줄로 나오지만, 숫자만 봐서는 감이 안 온다.
//   그래서 "덜 늙은 시간"을 생물의 수명에 견주어 본다. 하루살이 수명 몇 배인지, 사람 수명의 몇 %인지.

/**
 * 지구와 우주선의 경과 시간 차이를 여러 각도로 풀어 준다.
 * @param {{ earthTime: number, shipTime: number }} result  계산 결과 (초)
 * @param {object[]} organisms  data/organisms.js 항목들 (lifespan: 초)
 * @returns {{
 *   gap: number,                한 번 다녀왔을 때 덜 늙은 시간 (초)
 *   ratio: number,              지구 시간 대비 비율 (0~1)
 *   perYear: number,            지구에서 1년이 흐를 때 덜 늙는 시간 (초)
 *   equivalents: {organism: object, times: number}[]  각 생물 수명의 몇 배인지
 * }}
 */
export function ageGap(result, organisms = []) {
  const earthTime = Math.max(result?.earthTime ?? 0, 0);
  const shipTime = Math.max(result?.shipTime ?? 0, 0);
  const gap = Math.max(earthTime - shipTime, 0);
  const ratio = earthTime > 0 ? gap / earthTime : 0;
  return {
    gap,
    ratio,
    // 여행 길이와 상관없이 "이 속도라면 1년에 얼마"인지도 알려 준다
    perYear: ratio * 31_557_600,
    equivalents: organisms.map((organism) => ({
      organism,
      times: organism.lifespan > 0 ? gap / organism.lifespan : 0,
    })),
  };
}

/**
 * 덜 늙은 시간을 가장 잘 설명해 주는 생물 하나를 고른다.
 * 기준: 그 생물 수명의 0.02배 ~ 5000배 사이에 드는 것 중, 배수가 1에 가장 가까운 것.
 * (하루살이 수명의 3배, 개 수명의 28% 같은 표현이 100만 배보다 훨씬 와닿는다)
 * @param {{ equivalents: {organism: object, times: number}[] }} gapInfo
 * @returns {{organism: object, times: number} | null}
 */
export function bestEquivalent(gapInfo) {
  const candidates = (gapInfo?.equivalents ?? []).filter((e) => e.times >= 0.02 && e.times <= 5000);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, e) => (
    Math.abs(Math.log(e.times)) < Math.abs(Math.log(best.times)) ? e : best
  ));
}
