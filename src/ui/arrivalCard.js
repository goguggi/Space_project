// 도착 요약 카드 (21단계, D-93)
// 역할: 여행이 끝났을 때 3D 화면 가운데에 결과를 띄우고, 다음에 무엇을 할지 고르게 한다.
// 계산은 하지 않는다. main.js가 넘겨준 값을 보여 주기만 한다.
//
// 왜 필요한가: 예전에는 편도 여행이 끝나면 자막 한 줄만 바뀌고 화면에는 별과 우주선만 남았다.
//   "끝났다"는 것도, "무엇을 얻었는지"도, "다시 하려면 어디를 눌러야 하는지"도 알 수 없었다.

import { formatDuration } from '../utils/formatTime.js';

/**
 * @param {HTMLElement} container
 * @param {{ onReset: () => void, onReplay: () => void }} handlers
 * @returns {{ show: (s: object) => void, hide: () => void }}
 */
export function createArrivalCard(container, handlers) {
  const card = document.createElement('div');
  card.className = 'arrival-card';
  card.hidden = true;
  card.innerHTML = `
    <div class="arrival-title" id="arrival-title">도착</div>
    <div class="arrival-route" id="arrival-route"></div>
    <dl class="arrival-times">
      <div><dt>지구에서 흐른 시간</dt><dd id="arrival-earth">–</dd></div>
      <div><dt>우주선에서 흐른 시간</dt><dd id="arrival-ship">–</dd></div>
      <div class="arrival-gap"><dt>덜 늙은 시간</dt><dd id="arrival-diff">–</dd></div>
    </dl>
    <div class="arrival-note" id="arrival-note"></div>
    <div class="arrival-actions">
      <button type="button" class="mission-primary" id="arrival-reset">처음으로</button>
      <button type="button" class="mission-ghost" id="arrival-replay">여행 다시 보기</button>
      <button type="button" class="mission-ghost" id="arrival-close">닫기</button>
    </div>
  `;
  container.appendChild(card);

  const el = (id) => card.querySelector(`#${id}`);
  el('arrival-reset').addEventListener('click', () => handlers.onReset());
  el('arrival-replay').addEventListener('click', () => handlers.onReplay());
  el('arrival-close').addEventListener('click', () => { card.hidden = true; });

  return {
    /**
     * @param {{
     *   destination: string, roundTrip: boolean, earthSeconds: number, shipSeconds: number,
     *   gamma: number, note?: string,
     * }} s
     */
    show(s) {
      el('arrival-title').textContent = s.roundTrip ? '지구 귀환 완료' : `${s.destination} 도착`;
      el('arrival-route').textContent = s.roundTrip
        ? `지구 → ${s.destination} → 지구 (왕복)`
        : `지구 → ${s.destination} (편도)`;
      el('arrival-earth').textContent = formatDuration(s.earthSeconds);
      el('arrival-ship').textContent = formatDuration(s.shipSeconds);
      el('arrival-diff').textContent = formatDuration(Math.max(s.earthSeconds - s.shipSeconds, 0));
      el('arrival-note').textContent = s.note ?? '';
      card.hidden = false;
    },
    hide() { card.hidden = true; },
  };
}
