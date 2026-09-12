// 지구 표면 텍스처 만들기 (18단계, D-69)
// 역할: 바다·대륙·사막·극지방·구름을 캔버스에 그려 Three.js 텍스처로 돌려준다.
// 외부 이미지를 쓰지 않는다(저장소 원칙). 대륙 윤곽은 `data/earthOutline.js`의 좌표를 쓴다.
//
// 도법: 등장방형(equirectangular). 가로 = 경도 −180~180, 세로 = 위도 90~−90.
//   Three.js의 SphereGeometry가 이 배치를 그대로 구면에 감는다.

import * as THREE from '../../lib/three/three.module.js';
import { CONTINENTS, DRYLANDS } from '../data/earthOutline.js';

const WIDTH = 2048;
const HEIGHT = 1024;

const xOf = (lon) => ((lon + 180) / 360) * WIDTH;
const yOf = (lat) => ((90 - lat) / 180) * HEIGHT;

function fillPolygon(ctx, points, color) {
  ctx.beginPath();
  points.forEach(([lon, lat], i) => {
    const x = xOf(lon);
    const y = yOf(lat);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** 값 잡음 (구름과 지형 얼룩용). 외부 라이브러리 없이 간단한 격자 보간으로 만든다 */
function valueNoise(ctx, { cells, alpha, color }) {
  const gw = cells;
  const gh = Math.max(2, Math.round(cells / 2));
  const grid = Array.from({ length: gh + 1 }, () => Array.from({ length: gw + 1 }, () => Math.random()));
  const cw = WIDTH / gw;
  const ch = HEIGHT / gh;
  const smooth = (t) => t * t * (3 - 2 * t);
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data;
  const c = new THREE.Color(color);
  for (let y = 0; y < HEIGHT; y += 1) {
    const gy = Math.min(Math.floor(y / ch), gh - 1);
    const fy = smooth((y - gy * ch) / ch);
    for (let x = 0; x < WIDTH; x += 1) {
      const gx = Math.min(Math.floor(x / cw), gw - 1);
      const fx = smooth((x - gx * cw) / cw);
      const top = grid[gy][gx] * (1 - fx) + grid[gy][gx + 1] * fx;
      const bottom = grid[gy + 1][gx] * (1 - fx) + grid[gy + 1][gx + 1] * fx;
      const v = top * (1 - fy) + bottom * fy;
      const a = Math.max(0, v - 0.55) * alpha;   // 위쪽 값만 남겨 구름 덩어리처럼
      if (a <= 0.002) continue;
      const i = (y * WIDTH + x) * 4;
      data[i] = data[i] * (1 - a) + c.r * 255 * a;
      data[i + 1] = data[i + 1] * (1 - a) + c.g * 255 * a;
      data[i + 2] = data[i + 2] * (1 - a) + c.b * 255 * a;
    }
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * 지구 표면 텍스처.
 * @param {{ clouds?: boolean }} options
 * @returns {THREE.CanvasTexture}
 */
export function createEarthTexture({ clouds = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  // ---- 바다: 위도에 따라 색이 조금 달라지도록 세로 그라데이션 ----
  const sea = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sea.addColorStop(0, '#0f2f52');
  sea.addColorStop(0.35, '#12467a');
  sea.addColorStop(0.5, '#12508c');
  sea.addColorStop(0.65, '#12467a');
  sea.addColorStop(1, '#0f2f52');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ---- 대륙 ----
  for (const poly of CONTINENTS) fillPolygon(ctx, poly, '#2f6f43');
  // 대륙 가장자리를 살짝 밝게 (얕은 바다 느낌)
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(90, 170, 200, 0.35)';
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

  // ---- 사막 ----
  for (const poly of DRYLANDS) fillPolygon(ctx, poly, '#a98a52');

  // ---- 극지방 얼음 ----
  const north = ctx.createLinearGradient(0, 0, 0, yOf(62));
  north.addColorStop(0, 'rgba(255,255,255,0.95)');
  north.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = north;
  ctx.fillRect(0, 0, WIDTH, yOf(62));
  const south = ctx.createLinearGradient(0, HEIGHT, 0, yOf(-62));
  south.addColorStop(0, 'rgba(255,255,255,0.98)');
  south.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = south;
  ctx.fillRect(0, yOf(-62), WIDTH, HEIGHT - yOf(-62));

  // ---- 구름 ----
  if (clouds) valueNoise(ctx, { cells: 26, alpha: 1.6, color: 0xffffff });

  const texture = new THREE.CanvasTexture(canvas);
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
