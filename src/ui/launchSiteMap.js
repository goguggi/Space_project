// 발사장 구글지도 (17단계, D-60)
// 역할: 선택한 발사장의 위도·경도를 구글지도로 보여준다.
//
// 방식: `https://maps.google.com/maps?q=위도,경도&z=…&output=embed` 를 iframe으로 띄운다.
//   이 주소는 API 키가 없어도 되지만 **인터넷이 필요하다.** 그래서 오프라인(`열기.html`)이나
//   연결이 막힌 곳에서는 지도가 뜨지 않는다. 그럴 때를 위해 좌표와 바로가기 링크를 함께 둔다.
//   저장소에 지도 이미지를 넣지 않는 이유는 외부 자산을 두지 않는다는 원칙 때문이다.

const ZOOM = 11;

/**
 * @param {HTMLElement} container
 * @returns {{ update: (site: object | null) => void }}
 *   site: data/launchSites.js 항목 { name, country, latitude, longitude }
 */
export function createLaunchSiteMap(container) {
  const box = document.createElement('div');
  box.className = 'site-map';
  box.innerHTML = `
    <div class="site-map-frame">
      <iframe id="site-map-frame" title="발사장 위치 지도" loading="lazy"
              referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      <div class="site-map-fallback" id="site-map-fallback">
        지도를 불러오려면 인터넷 연결이 필요합니다.
      </div>
    </div>
    <p class="site-map-note">
      <span id="site-map-coords">-</span>
      · <a id="site-map-link" href="#" target="_blank" rel="noopener">구글지도에서 열기</a>
    </p>
  `;
  container.appendChild(box);

  const frame = box.querySelector('#site-map-frame');
  const fallback = box.querySelector('#site-map-fallback');
  const coords = box.querySelector('#site-map-coords');
  const link = box.querySelector('#site-map-link');

  // 지도가 실제로 떴는지 알 수 없으므로(다른 출처라 내용을 읽을 수 없다), load 사건으로만 판단한다
  frame.addEventListener('load', () => { fallback.hidden = true; });

  function update(site) {
    if (!site) return;
    const q = `${site.latitude},${site.longitude}`;
    fallback.hidden = false;
    frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${ZOOM}&output=embed`;
    coords.textContent = `${site.name} · ${q}`;
    link.href = `https://www.google.com/maps/@${site.latitude},${site.longitude},${ZOOM}z`;
  }

  return { update };
}
