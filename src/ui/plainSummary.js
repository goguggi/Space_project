// 한 문장 요약 (21단계, D-97)
// 역할: 표와 그래프를 보기 전에, 지금 설정이 무엇을 뜻하는지 한국어 문장 하나로 알려 준다.
// 계산은 physics/ageGap.js와 physics/lorentz.js가 한다.

import { ageGap, bestEquivalent } from '../physics/ageGap.js';
import { ORGANISMS } from '../data/organisms.js';
import { beta, gamma } from '../physics/lorentz.js';
import { formatDuration } from '../utils/formatTime.js';
import { formatNumber } from '../utils/units.js';

/**
 * @param {HTMLElement} container
 * @returns {{ update: (s: object) => void }}
 */
export function createPlainSummary(container) {
  const box = document.createElement('div');
  box.className = 'plain-summary';
  box.innerHTML = `
    <p class="plain-line" id="plain-line">발사장과 목적지, 속도를 고르면 여기에 요약이 나옵니다.</p>
    <p class="plain-gap" id="plain-gap"></p>
    <p class="plain-why field-note" id="plain-why"></p>
  `;
  container.appendChild(box);

  const el = (id) => box.querySelector(`#${id}`);

  return {
    /**
     * @param {{ result: object, destinationName: string, roundTrip: boolean, speed: number }} s
     */
    update(s) {
      if (!s?.result || !s.speed) return;
      const b = beta(s.speed);
      const g = gamma(s.speed);
      const info = ageGap(s.result, ORGANISMS);
      const equivalent = bestEquivalent(info);

      el('plain-line').innerHTML = `빛의 <b>${formatNumber(b * 100, b < 0.01 ? 5 : 2)}%</b> 속도로 `
        + `<b>${s.destinationName}</b>까지 ${s.roundTrip ? '왕복으로' : '편도로'} 가면, `
        + `지구에서는 <b>${formatDuration(s.result.earthTime)}</b>가 흐르는 동안 `
        + `우주선에서는 <b>${formatDuration(s.result.shipTime)}</b>가 흐릅니다.`;

      const gapText = info.gap > 0 ? formatDuration(info.gap) : '거의 0';
      el('plain-gap').innerHTML = `→ 우주선에 탄 쪽이 <b>${gapText}</b> 덜 늙습니다.`
        + (equivalent
          ? ` (${equivalent.organism.icon} ${equivalent.organism.name} 수명의 `
            + (equivalent.times >= 1
              ? `<b>${formatNumber(equivalent.times, equivalent.times < 10 ? 1 : 0)}배</b>)`
              : `<b>${formatNumber(equivalent.times * 100, 1)}%</b>)`)
          : '');

      el('plain-why').textContent = g - 1 < 1e-9
        ? `로런츠 인자 γ = ${g.toFixed(9)}. 이 속도에서는 시간 지연이 사실상 없습니다. `
          + '광속의 10%를 넘겨 보면 값이 눈에 띄게 벌어집니다.'
        : `로런츠 인자 γ = ${formatNumber(g, 4)}. 지구 시간의 ${formatNumber(info.ratio * 100, 2)}%만큼 `
          + `덜 흘렀습니다. 같은 속도로 계속 간다면 지구에서 1년마다 ${formatDuration(info.perYear)}씩 벌어집니다.`;
    },
  };
}
