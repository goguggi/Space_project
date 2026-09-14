// 일상 속도와 견주어 보는 시간 지연 표 (21단계, D-97)
// 역할: 우리가 이미 겪고 있는 속도들과 지금 고른 속도를 한 표에 놓고,
//       "지구에서 1년이 흐를 때 얼마나 덜 늙는지"를 나란히 보여 준다. 계산은 physics/lorentz.js.
//
// 여기서 말하는 값은 **특수 상대성(속도) 효과만** 계산한 것이다.
//   실제 지구 위 시계에는 중력에 의한 효과도 함께 작용해서(일반 상대성) 서로 일부 상쇄된다.
//   GPS 위성이 두 가지를 모두 보정하는 이유가 이것이다. 표 아래에 이 점을 적어 둔다.

import { EVERYDAY_SPEEDS, SPEED_OF_SOUND } from '../data/everydaySpeeds.js';
import { beta, gammaMinusOne } from '../physics/lorentz.js';
import { formatNumber } from '../utils/units.js';

const YEAR = 31_557_600;

/** 아주 작은 시간을 사람이 읽을 수 있는 단위로 */
function tinyTime(seconds) {
  if (seconds >= 1) return `${formatNumber(seconds, 2)} 초`;
  if (seconds >= 1e-3) return `${formatNumber(seconds * 1e3, 1)} 밀리초`;
  if (seconds >= 1e-6) return `${formatNumber(seconds * 1e6, 1)} 마이크로초`;
  if (seconds >= 1e-9) return `${formatNumber(seconds * 1e9, 1)} 나노초`;
  if (seconds <= 0) return '0';
  return `${formatNumber(seconds * 1e12, 0)} 피코초`;
}

function speedText(v) {
  if (v >= 1000) return `${formatNumber(v / 1000, v >= 100_000 ? 0 : 1)} km/s`;
  return `${formatNumber(v, v < 10 ? 1 : 0)} m/s (마하 ${formatNumber(v / SPEED_OF_SOUND, v < 100 ? 2 : 1)})`;
}

/**
 * @param {HTMLElement} container
 * @returns {{ update: (speed: number) => void }}
 */
export function createEverydayDilation(container) {
  const box = document.createElement('div');
  box.className = 'everyday-dilation';
  box.innerHTML = `
    <p class="field-note">
      지구에서 <b>1년</b>이 흐르는 동안, 그 속도로 움직인 시계가 <b>덜 가는 시간</b>입니다.
      우리도 가만히 있는 게 아닙니다 — 지구 자전만으로 이미 마하 1.4로 움직이는 중입니다.
    </p>
    <table class="everyday-table">
      <thead>
        <tr><th>무엇</th><th>속도</th><th>광속 대비</th><th>1년에 덜 가는 시간</th></tr>
      </thead>
      <tbody id="everyday-rows"></tbody>
    </table>
    <p class="field-note everyday-caveat">
      속도에 의한 효과(특수 상대성)만 계산한 값입니다. 실제 지구 위 시계에는 중력에 의한 효과도
      함께 작용해 서로 일부 상쇄됩니다. GPS 위성이 두 가지를 모두 보정하는 이유입니다.
    </p>
  `;
  container.appendChild(box);

  const rowsEl = box.querySelector('#everyday-rows');

  function rowHtml({ name, icon, speed, highlight }, isNow = false) {
    const b = beta(speed);
    const perYear = gammaMinusOne(speed) * YEAR;
    const cls = isNow ? 'everyday-now' : (highlight ? 'everyday-mark' : '');
    return `<tr class="${cls}">
      <td>${icon ?? ''} ${name}</td>
      <td>${speedText(speed)}</td>
      <td>${b < 1e-4 ? `${(b * 100).toExponential(1)} %` : `${formatNumber(b * 100, 2)} %`}</td>
      <td>${tinyTime(perYear)}</td>
    </tr>`;
  }

  return {
    /** 지금 고른 속도를 표 안에 끼워 넣어 어디쯤인지 보이게 한다 */
    update(speed) {
      const now = { name: '지금 고른 속도', icon: '🚀', speed: speed ?? 0 };
      const all = [...EVERYDAY_SPEEDS].sort((a, b2) => a.speed - b2.speed);
      const html = [];
      let placed = false;
      for (const item of all) {
        if (!placed && now.speed < item.speed) { html.push(rowHtml(now, true)); placed = true; }
        html.push(rowHtml(item));
      }
      if (!placed) html.push(rowHtml(now, true));
      rowsEl.innerHTML = html.join('');
    },
  };
}
