// NASA 실사 지구 사진 불러오기 (21단계, D-88)
// 역할: 있으면 NASA 블루마블 사진을 텍스처로 돌려주고, 없으면 null을 돌려준다.
//       못 불러와도 화면은 그대로 돌아간다 — 그때는 earthTexture.js가 그린 지구가 쓰인다.
//
// 왜 이렇게 하나: 이 저장소는 외부 자산 없이 오프라인(`열기.html`)에서도 열려야 한다(D-69).
//   그래서 사진은 "있으면 쓰는 선택 사항"으로 둔다. 찾는 순서는 아래 세 가지.
//     1) window.__EARTH_PHOTO_DATA_URL — `tools/build_single.py`가 사진을 열기.html 안에 박아 넣은 경우
//     2) assets/earth/blue_marble.jpg — 저장소에 사진을 직접 넣은 경우 (로컬 서버로 열 때만)
//     3) NASA Visible Earth 원본 주소 — 로컬 서버로 열고 인터넷에 연결돼 있을 때만
//   file:// 로 연 열기.html에서는 2·3번을 브라우저가 막으므로 1번만 시도한다.
//
// 저작권: NASA가 만든 이 사진들은 퍼블릭 도메인이라 교육·발표용으로 자유롭게 쓸 수 있다.
//   (출처 표기 권장: NASA Earth Observatory / Blue Marble, Reto Stöckli)
//   내려받는 방법은 assets/earth/README.md에 적어 두었다.

import * as THREE from '../../lib/three/three.module.js';

// NASA Visible Earth "Blue Marble: Land Surface, Shallow Water, and Shaded Topography"
// https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography
const NASA_URL = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg';
const LOCAL_PATH = 'assets/earth/blue_marble.jpg';

/** 후보 주소들을 순서대로 만든다 */
function candidates() {
  const list = [];
  if (typeof window !== 'undefined' && window.__EARTH_PHOTO_DATA_URL) list.push(window.__EARTH_PHOTO_DATA_URL);
  // file:// 로 열었을 때는 옆에 둔 그림 파일도, 원격 주소도 브라우저가 막는다(CORS).
  // 그때 쓸 수 있는 건 위의 data URL뿐이므로 괜한 요청을 보내지 않는다.
  if (typeof location !== 'undefined' && location.protocol.startsWith('http')) {
    list.push(LOCAL_PATH);
    list.push(NASA_URL);
  }
  return list;
}

function loadOne(url) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

/**
 * 쓸 수 있는 지구 사진을 찾아 텍스처로 돌려준다.
 * @returns {Promise<THREE.Texture | null>}  못 찾으면 null
 */
export async function loadEarthPhoto() {
  for (const url of candidates()) {
    const texture = await loadOne(url);      // eslint-disable-line no-await-in-loop
    if (texture) return texture;
  }
  return null;
}
