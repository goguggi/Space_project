// 발사대 화염 연기 (21단계)
// 역할: 이륙 순간 발사대 화염 유도로에서 옆으로 쏟아져 나오는 연기·수증기 구름을 만든다.
// 물리 계산은 하지 않는다. 고도와 연소 여부만 받아 파티클을 뿌리고 늙힌다.
//
// 왜 필요한가: 실제 발사 영상에서 가장 먼저 눈에 들어오는 것은 불꽃 자체보다
//   발사대 양옆으로 터져 나오는 거대한 흰 구름이다. 화염 유도로(flame trench)로 빠져나온
//   배기와, 소음을 줄이려고 발사 직전 쏟아붓는 물이 순식간에 끓어 생긴 수증기다.
//   이게 없으면 아무리 불꽃을 키워도 "발사"처럼 보이지 않는다.
//
// 좌표: 화면 단위 (1 단위 = SCENE_METERS_PER_UNIT m). 발사대 바닥이 y = 0.

import * as THREE from '../../lib/three/three.module.js';
import { SCENE_METERS_PER_UNIT as S } from './launchScene.js';

const MAX_PARTICLES = 54;
// 이 고도(m)를 넘으면 더 이상 발사대에서 연기가 나오지 않는다 (로켓이 이미 멀리 떠났다)
const EMIT_UNTIL_ALTITUDE = 2_000;

/** 부드러운 연기 알갱이 그림 (가운데가 밝고 가장자리가 투명한 원) */
function makeSmokeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  // 얼룩덜룩한 덩어리로 보이도록 작은 원을 여러 개 겹쳐 찍는다
  for (let i = 0; i < 22; i += 1) {
    const cx = 64 + (Math.random() - 0.5) * 46;
    const cy = 64 + (Math.random() - 0.5) * 46;
    const r = 16 + Math.random() * 26;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,255,255,0.30)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 바깥 테두리를 확실히 지워 사각형 자국이 보이지 않게 한다
  const fade = ctx.createRadialGradient(64, 64, 40, 64, 64, 64);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 발사대 연기 무리를 만든다.
 * @returns {{
 *   group: THREE.Group,
 *   update: (dt: number, s: { altitude: number, burning: boolean, downrangeUnits?: number }) => void,
 *   reset: () => void,
 * }}
 */
export function createPadPlume() {
  const group = new THREE.Group();
  const texture = makeSmokeTexture();
  const particles = [];

  for (let i = 0; i < MAX_PARTICLES; i += 1) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
    }));
    sprite.visible = false;
    group.add(sprite);
    particles.push({ sprite, life: 0, maxLife: 1, vx: 0, vy: 0, vz: 0, size: 1, tint: 1 });
  }

  let emitCarry = 0;

  /** 알갱이 하나를 발사대 가장자리에서 다시 태어나게 한다 */
  function spawn(p, hot) {
    const angle = Math.random() * Math.PI * 2;
    // 화염 유도로에서 옆으로 뿜어져 나오므로 처음부터 발사대 둘레(약 40 m)에 놓는다
    const r = (90 + Math.random() * 150) / S;
    p.sprite.position.set(Math.cos(angle) * r, (2 + Math.random() * 14) / S, Math.sin(angle) * r);
    // 옆으로 빠르게 퍼지면서 서서히 뜬다 (m/s → 화면 단위/s)
    const out = (25 + Math.random() * 45) / S;
    p.vx = Math.cos(angle) * out;
    p.vz = Math.sin(angle) * out;
    p.vy = (3 + Math.random() * 7) / S;
    p.maxLife = 3.5 + Math.random() * 3.5;
    p.life = 0;
    p.size = (26 + Math.random() * 40) / S;
    // 갓 나온 연기는 배기 불빛을 받아 누렇고, 시간이 지나면 흰 수증기로 식는다
    p.tint = hot ? 0.35 + Math.random() * 0.3 : 0;
    p.sprite.visible = true;
  }

  const color = new THREE.Color();

  function update(dt, { altitude = 0, burning = false } = {}) {
    // ---- 새 연기 뿜기 ----
    if (burning && altitude < EMIT_UNTIL_ALTITUDE) {
      // 발사 직후가 가장 격렬하고, 로켓이 올라갈수록 잦아든다
      const strength = 1 - Math.min(altitude / EMIT_UNTIL_ALTITUDE, 1);
      emitCarry += dt * (5 + 15 * strength);
      while (emitCarry >= 1) {
        emitCarry -= 1;
        const free = particles.find((p) => !p.sprite.visible);
        if (!free) break;
        spawn(free, strength > 0.5);
      }
    }

    // ---- 늙히기 ----
    for (const p of particles) {
      if (!p.sprite.visible) continue;
      p.life += dt;
      if (p.life >= p.maxLife) { p.sprite.visible = false; continue; }
      const t = p.life / p.maxLife;

      p.sprite.position.x += p.vx * dt;
      p.sprite.position.y += p.vy * dt;
      p.sprite.position.z += p.vz * dt;
      // 공기 저항으로 옆 방향은 느려지고, 더운 연기라 위로는 조금 더 뜬다
      const drag = Math.exp(-0.9 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + (6 / S) * dt;

      // 부풀면서 옅어진다
      const grow = 1 + t * 2.0;
      p.sprite.scale.setScalar(p.size * grow);
      p.sprite.material.opacity = 0.22 * Math.min(t * 6, 1) * (1 - t) ** 1.4;
      const warm = p.tint * (1 - t) ** 2;
      color.setRGB(1, 1 - warm * 0.35, 1 - warm * 0.75);
      p.sprite.material.color.copy(color);
    }
  }

  function reset() {
    for (const p of particles) { p.sprite.visible = false; p.life = 0; }
    emitCarry = 0;
  }

  return { group, update, reset };
}
