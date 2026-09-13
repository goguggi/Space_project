// 지구 표면 텍스처 만들기 (18단계 D-69, 21단계 D-87에서 사실적으로 다시 그림)
// 역할: 바다 깊이·기후대별 지표색·산맥 얼룩·극지방 얼음을 캔버스에 그려 Three.js 텍스처로 돌려준다.
//       구름은 따로 만들어(createCloudTexture) 지구보다 조금 큰 구에 씌운다.
//
// NASA 실사 사진(블루마블)이 있으면 그쪽을 먼저 쓴다 → `earthPhoto.js`.
//   사진이 없거나 오프라인이면 여기서 그린 그림이 쓰인다. 그래서 인터넷 없이도 항상 지구가 보인다.
//
// 도법: 등장방형(equirectangular). 가로 = 경도 −180~180, 세로 = 위도 90~−90.
//   Three.js의 SphereGeometry가 이 배치를 그대로 구면에 감는다.
//
// 그리는 방법: 픽셀을 하나하나 계산하면 200만 번 반복이라 느리다.
//   대신 작은 잡음 그림을 만들어 크게 늘려 겹치고(캔버스 확대 보간 = 부드러운 잡음),
//   canvas의 합성 모드(multiply / overlay / source-in)로 층층이 쌓는다. 훨씬 빠르고 결과도 부드럽다.

import * as THREE from '../../lib/three/three.module.js';
import { CONTINENTS, DRYLANDS } from '../data/earthOutline.js';

const WIDTH = 2048;
const HEIGHT = 1024;

const xOf = (lon) => ((lon + 180) / 360) * WIDTH;
const yOf = (lat) => ((90 - lat) / 180) * HEIGHT;

function makeCanvas(w = WIDTH, h = HEIGHT) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** 작은 무작위 격자 하나 (뒤에서 크게 늘려 부드러운 잡음으로 쓴다) */
function noiseTile(cells, rows) {
  const canvas = makeCanvas(cells, rows);
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(cells, rows);
  for (let i = 0; i < cells * rows; i += 1) {
    const v = Math.floor(Math.random() * 256);
    image.data[i * 4] = v;
    image.data[i * 4 + 1] = v;
    image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * 여러 크기의 잡음을 겹친 회색 그림 (fBm).
 * octaves = [[격자수, 세기], ...] — 격자가 촘촘할수록 잔결, 성길수록 큰 덩어리.
 */
function fbmCanvas(octaves, w = WIDTH / 2, h = HEIGHT / 2) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const [cells, weight] of octaves) {
    ctx.globalAlpha = weight;
    ctx.drawImage(noiseTile(cells, Math.max(2, Math.round(cells / 2))), 0, 0, w, h);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** 대륙(또는 사막) 다각형들을 하나의 흑백 마스크로 그린다 */
function polygonMask(polygons, { blur = 0 } = {}) {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  if (blur > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = blur;
  }
  ctx.fillStyle = '#ffffff';
  for (const poly of polygons) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = xOf(lon);
      const y = yOf(lat);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  return canvas;
}

/** 위도에 따른 기후대 색 띠 (툰드라 → 침엽수림 → 온대 → 건조 → 열대) */
function biomeStrip() {
  const canvas = makeCanvas(4, HEIGHT);
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  const stop = (lat, color) => g.addColorStop(yOf(lat) / HEIGHT, color);
  stop(90, '#e8eef2');    // 극지 — 눈과 얼음
  stop(72, '#b9c0b4');    // 툰드라
  stop(60, '#4d6142');    // 침엽수림 (짙은 녹갈색)
  stop(45, '#5c7440');    // 온대림
  stop(33, '#8f8a4e');    // 건조대
  stop(22, '#a8935a');    // 사막 언저리
  stop(10, '#3f7038');    // 열대우림
  stop(-8, '#3d6f36');
  stop(-22, '#9a8a55');   // 남반구 건조대
  stop(-38, '#5d7442');
  stop(-55, '#8d9686');
  stop(-70, '#dfe6ea');
  stop(-90, '#f2f6f8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, HEIGHT);
  return canvas;
}

/**
 * 지구 표면 텍스처.
 * @param {{ clouds?: boolean }} options  clouds=true면 얇은 구름을 지표에도 살짝 섞는다
 * @returns {THREE.CanvasTexture}
 */
export function createEarthTexture({ clouds = false } = {}) {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');

  // ---- 1. 깊은 바다 ----
  const sea = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sea.addColorStop(0, '#0a2036');
  sea.addColorStop(0.3, '#0d3a63');
  sea.addColorStop(0.5, '#0f4b83');
  sea.addColorStop(0.7, '#0d3a63');
  sea.addColorStop(1, '#0a2036');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 바다에도 옅은 얼룩(해류·수심 차이)을 넣어 단색으로 보이지 않게 한다
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.35;
  ctx.drawImage(fbmCanvas([[8, 0.6], [24, 0.4], [64, 0.25]]), 0, 0, WIDTH, HEIGHT);
  ctx.restore();

  // ---- 2. 대륙붕 (해안에서 바깥으로 밝아지는 옥색 띠) ----
  // 대륙 마스크를 흐리게 그린 뒤 옥색으로 칠해 얕은 바다처럼 보이게 한다
  const shelf = makeCanvas();
  const sctx = shelf.getContext('2d');
  sctx.drawImage(polygonMask(CONTINENTS, { blur: 26 }), 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#2f8fb5';
  sctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.drawImage(shelf, 0, 0);
  ctx.restore();

  // ---- 3. 육지 ----
  const landMask = polygonMask(CONTINENTS);
  const land = makeCanvas();
  const lctx = land.getContext('2d');
  // 기후대 띠를 가로로 늘려 육지 모양 안에만 남긴다
  lctx.drawImage(biomeStrip(), 0, 0, 4, HEIGHT, 0, 0, WIDTH, HEIGHT);
  // 사막을 덧칠
  lctx.save();
  lctx.globalAlpha = 0.85;
  const dry = makeCanvas();
  const dctx = dry.getContext('2d');
  dctx.drawImage(polygonMask(DRYLANDS, { blur: 18 }), 0, 0);
  dctx.globalCompositeOperation = 'source-in';
  dctx.fillStyle = '#b99a5f';
  dctx.fillRect(0, 0, WIDTH, HEIGHT);
  lctx.drawImage(dry, 0, 0);
  lctx.restore();
  // 산맥·식생 얼룩
  lctx.save();
  lctx.globalCompositeOperation = 'overlay';
  lctx.globalAlpha = 0.55;
  lctx.drawImage(fbmCanvas([[12, 0.5], [40, 0.45], [120, 0.35], [300, 0.2]]), 0, 0, WIDTH, HEIGHT);
  lctx.restore();
  // 육지 모양으로 오려내기
  lctx.globalCompositeOperation = 'destination-in';
  lctx.drawImage(landMask, 0, 0);
  ctx.drawImage(land, 0, 0);

  // 해안선을 살짝 어둡게 해 윤곽을 또렷하게
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#1d3a2a';
  ctx.lineWidth = 2.5;
  for (const poly of CONTINENTS) {
    ctx.beginPath();
    poly.forEach(([lon, lat], i) => {
      const x = xOf(lon);
      const y = yOf(lat);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // ---- 4. 극지방 얼음 (가장자리를 잡음으로 들쭉날쭉하게) ----
  const ice = makeCanvas();
  const ictx = ice.getContext('2d');
  const north = ictx.createLinearGradient(0, 0, 0, yOf(58));
  north.addColorStop(0, 'rgba(255,255,255,1)');
  north.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  north.addColorStop(1, 'rgba(255,255,255,0)');
  ictx.fillStyle = north;
  ictx.fillRect(0, 0, WIDTH, yOf(58));
  const south = ictx.createLinearGradient(0, HEIGHT, 0, yOf(-58));
  south.addColorStop(0, 'rgba(255,255,255,1)');
  south.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  south.addColorStop(1, 'rgba(255,255,255,0)');
  ictx.fillStyle = south;
  ictx.fillRect(0, yOf(-58), WIDTH, HEIGHT - yOf(-58));
  ictx.save();
  ictx.globalCompositeOperation = 'destination-out';
  ictx.globalAlpha = 0.5;
  ictx.drawImage(fbmCanvas([[16, 0.6], [60, 0.5]]), 0, 0, WIDTH, HEIGHT);
  ictx.restore();
  ctx.drawImage(ice, 0, 0);

  // ---- 5. (선택) 지표에 아주 옅은 구름 그림자 느낌 ----
  if (clouds) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(createCloudCanvas(), 0, 0);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * 구름 그림 (흰색 + 알파). 적도의 열대수렴대와 중위도 저기압 띠가 보이도록 위도별로 양을 다르게 준다.
 * @returns {HTMLCanvasElement}
 */
function createCloudCanvas() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  // 큰 소용돌이 + 잔구름
  ctx.drawImage(fbmCanvas([[6, 0.65], [18, 0.5], [48, 0.4], [140, 0.25]]), 0, 0, WIDTH, HEIGHT);

  // 회색 잡음을 "밝은 부분만 남기는" 알파로 바꾼다
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data;
  for (let y = 0; y < HEIGHT; y += 1) {
    const lat = 90 - (y / HEIGHT) * 180;
    // 위도별 구름 양: 적도(수렴대)와 남·북위 55° 부근(폭풍대)이 많고, 20~30°(아열대 고압)는 적다
    const band = 0.55
      + 0.45 * Math.exp(-((lat / 9) ** 2))
      + 0.4 * Math.exp(-(((Math.abs(lat) - 56) / 14) ** 2))
      - 0.35 * Math.exp(-(((Math.abs(lat) - 25) / 11) ** 2));
    for (let x = 0; x < WIDTH; x += 1) {
      const i = (y * WIDTH + x) * 4;
      const v = data[i] / 255;
      const a = Math.max(0, v - 0.52) * 3.1 * band;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(Math.min(a, 1) * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/**
 * 지구를 감싸는 구름층 텍스처 (반투명).
 * @returns {THREE.CanvasTexture}
 */
export function createCloudTexture() {
  const texture = new THREE.CanvasTexture(createCloudCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * 발사장 좌표가 구의 +Y(발사대가 놓인 꼭대기)로 오도록 지구를 돌릴 각도.
 *
 * Three.js SphereGeometry에서 위도 lat, 경도 lon 인 점은
 *   φ = (90 − lat)·π/180  (+Y에서 잰 각), θ = (lon + 180)·π/180
 * 에 놓인다. Y축으로 −θ 만큼 돌려 XY 평면으로 옮긴 뒤, Z축으로 −φ 만큼 돌리면 그 점이 +Y에 온다.
 * 그래서 회전 순서를 'ZYX'로 두고 y = −θ, z = −φ 를 준다.
 *
 * @param {{ latitude: number, longitude: number }} site
 * @returns {{ y: number, z: number }}  라디안 (order = 'ZYX')
 */
export function rotationForSite(site) {
  if (!site) return { y: 0, z: 0 };
  const phi = ((90 - site.latitude) * Math.PI) / 180;
  const theta = ((site.longitude + 180) * Math.PI) / 180;
  return { y: -theta, z: -phi };
}
