// 로켓 3D 형상 (11단계, 12단계에서 단별 분리 표시)
// 역할: 로켓 제원의 geometry.parts 로 단별 그룹을 만들고, 연소 중인 단에 화염을 붙인다.
// 물리 계산은 하지 않는다. 좌표는 화면 단위(1 단위 = SCENE_METERS_PER_UNIT m).

import * as THREE from '../../lib/three/three.module.js';
import { SCENE_METERS_PER_UNIT } from './launchScene.js';

const S = SCENE_METERS_PER_UNIT;

// ---- 재질 (18단계, R-9: 실제 팔콘 헤비에 가깝게) ----
// 흰 도장 + 검은 인터스테이지 + 금속 노즐. 표면 명암은 캔버스로 만든 세로 줄무늬 텍스처로 낸다.
function makeHullTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  for (let x = 0; x < 64; x += 1) {
    // 원통을 감았을 때 옆면이 어둡게 보이도록 좌우로 밝기를 준다
    const shade = 0.72 + 0.28 * Math.sin((x / 64) * Math.PI * 2 + Math.PI / 2);
    const v = Math.round(232 * shade);
    ctx.fillStyle = `rgb(${v},${v + 3},${Math.min(255, v + 12)})`;
    ctx.fillRect(x, 0, 1, 8);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const bodyMaterial = new THREE.MeshStandardMaterial({ map: makeHullTexture(), roughness: 0.45, metalness: 0.12 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x1b2033, roughness: 0.85, metalness: 0.05 });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x8d94a6, roughness: 0.35, metalness: 0.85 });
const sootMaterial = new THREE.MeshStandardMaterial({ color: 0x14161d, roughness: 0.95 });
// ---- 화염 재질 (21단계) ----
// 실제 로켓 배기는 세 겹으로 보인다: 노즐 바로 아래의 하얗게 타는 심,
// 그 둘레의 주황 불꽃, 바깥으로 흩어지는 옅은 연기. 겹칠수록 밝아지도록 가산 혼합을 쓴다.
const flameMaterial = new THREE.MeshBasicMaterial({
  color: 0xff8c2a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
});
const flameMidMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd27a, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false,
});
const flameCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xdcefff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
});
const flameHazeMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6a1e, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
});

/** 노즐 주변 발광용 원형 그라데이션 (스프라이트에 붙인다) */
function makeGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,240,200,0.95)');
  g.addColorStop(0.25, 'rgba(255,168,64,0.55)');
  g.addColorStop(0.6, 'rgba(255,96,20,0.18)');
  g.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const glowTexture = makeGlowTexture();

function makePart(part) {
  const [w, h] = part.size;
  let mesh;
  if (part.type === 'fairing') {
    mesh = new THREE.Mesh(new THREE.ConeGeometry((w / 2) / S, h / S, 24), bodyMaterial);
  } else {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry((w / 2) / S, (w / 2) / S, h / S, 32), bodyMaterial);
    const radius = (w / 2) / S;
    const half = (h / 2) / S;

    // 아래쪽 엔진 스커트 (그을음 색)
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.05, 2.4 / S, 32), sootMaterial);
    skirt.position.y = -half + 1.2 / S;
    mesh.add(skirt);

    // 노즐 여러 개 (팔콘 헤비 1단은 멀린 9기: 가운데 1 + 둘레 8)
    const nozzle = () => new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.13, radius * 0.2, 1.8 / S, 12),
      metalMaterial,
    );
    const center = nozzle();
    center.position.y = -half - 0.7 / S;
    mesh.add(center);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const n = nozzle();
      n.position.set(Math.cos(a) * radius * 0.6, -half - 0.6 / S, Math.sin(a) * radius * 0.6);
      mesh.add(n);
    }

    // 위쪽 인터스테이지 (검은 띠)
    const inter = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.01, radius * 1.01, 3.2 / S, 32), darkMaterial);
    inter.position.y = half - 1.6 / S;
    mesh.add(inter);

    // 격자 날개 (그리드 핀) — 위쪽 바깥으로 네 장
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6 / S, 2.2 / S, 0.25 / S), metalMaterial);
      fin.position.set(Math.cos(a) * radius * 1.12, half - 4.6 / S, Math.sin(a) * radius * 1.12);
      fin.rotation.y = -a;
      mesh.add(fin);
    }

    // 착륙 다리 (접힌 상태로 아래쪽에 붙어 있다)
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5 / S, 6.5 / S, 0.5 / S), darkMaterial);
      leg.position.set(Math.cos(a) * radius * 1.03, -half + 5 / S, Math.sin(a) * radius * 1.03);
      mesh.add(leg);
    }
  }
  mesh.position.set(part.position[0] / S, part.position[1] / S, part.position[2] / S);
  mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
  return mesh;
}

function makeFlame(diameterM) {
  const group = new THREE.Group();
  const d = diameterM / S;          // 화면 단위로 잰 엔진부 지름

  // 원뿔을 아래로 향하게 놓는 도우미. length 만큼 내려간다
  const plume = (radius, length, material, offset = 0) => {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, length, 24, 1, true), material);
    mesh.rotation.x = Math.PI;      // 꼭짓점이 아래로
    mesh.position.y = -(length / 2) - offset;
    return mesh;
  };

  // 1) 바깥 연기 기둥: 길고 옅게 퍼진다
  const haze = plume(d * 0.75, d * 7.5, flameHazeMaterial);
  // 2) 주황 불꽃
  const outer = plume(d * 0.5, d * 4.4, flameMaterial);
  // 3) 노란 중간층
  const mid = plume(d * 0.32, d * 2.9, flameMidMaterial);
  // 4) 하얗게 타는 심 (노즐 바로 아래)
  const core = plume(d * 0.16, d * 1.7, flameCoreMaterial);
  group.add(haze, outer, mid, core);

  // 5) 마하 디스크: 초음속 배기에 생기는 밝은 마디 (docs/03_physics.md 참고)
  const disks = [];
  for (let i = 0; i < 4; i += 1) {
    const disk = new THREE.Mesh(
      new THREE.SphereGeometry(d * (0.17 - i * 0.028), 14, 8),
      new THREE.MeshBasicMaterial({
        color: 0xfff4d2, transparent: true, opacity: 0.5 - i * 0.09,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    disk.scale.y = 0.4;
    disk.position.y = -d * (0.8 + i * 0.62);
    group.add(disk);
    disks.push(disk);
  }

  // 6) 노즐 발광 (항상 카메라를 보는 스프라이트)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: 0xffffff, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
  }));
  glow.scale.set(d * 4.5, d * 4.5, 1);
  glow.position.y = -d * 0.6;
  group.add(glow);

  // 7) 실제로 주변을 밝히는 빛 — 발사대와 로켓 아랫부분이 화염빛을 받는다
  const light = new THREE.PointLight(0xffa33c, 0, d * 140, 2);
  light.position.y = -d * 1.2;
  group.add(light);

  group.userData.parts = { haze, outer, mid, core, disks, glow, light, d };
  group.visible = false;
  return group;
}

/**
 * 화염 한 벌의 모양을 지금 상태에 맞춘다.
 * - 흔들림: 길이와 굵기를 빠르게 떨어 실제 불꽃처럼 보이게 한다.
 * - 고도에 따른 팽창: 공기가 옅어질수록 배기가 옆으로 크게 퍼진다(과팽창 → 저팽창).
 *   실제 로켓 영상에서 고도가 오를수록 불꽃이 종처럼 벌어지는 이유다.
 * @param {THREE.Group} flame
 * @param {number} phase     흔들림 위상
 * @param {number} altitude  고도 (m)
 * @param {number} throttle  0~1
 */
function shapeFlame(flame, phase, altitude, throttle) {
  const p = flame.userData.parts;
  if (!p) return;
  // 고도 0 km에서 1배, 60 km 위에서 약 2.4배까지 벌어진다
  const spread = 1 + 1.4 * Math.min(Math.max(altitude, 0) / 60_000, 1);
  const wobble = 0.9 + 0.1 * Math.sin(phase * 2.7) + 0.05 * Math.sin(phase * 6.3);
  const power = 0.35 + 0.65 * Math.min(Math.max(throttle, 0), 1);

  flame.scale.set(1, 1, 1);
  p.haze.scale.set(spread * 1.15, wobble * power * 1.1, spread * 1.15);
  p.outer.scale.set(spread, wobble * power, spread);
  p.mid.scale.set(1 + (spread - 1) * 0.6, (0.95 + 0.12 * Math.sin(phase * 4.1)) * power, 1 + (spread - 1) * 0.6);
  p.core.scale.set(1, 0.9 + 0.16 * Math.sin(phase * 7.9), 1);
  // 마하 디스크는 공기가 있을 때(저고도)에만 뚜렷하다
  const diskShow = 1 - Math.min(Math.max(altitude, 0) / 30_000, 1);
  for (const disk of p.disks) disk.visible = diskShow > 0.15;
  p.glow.scale.setScalar(p.d * (4.2 + 1.4 * Math.sin(phase * 3.3)) * power);
  p.light.intensity = 45 * power * (0.85 + 0.15 * Math.sin(phase * 5.1));
}

/**
 * 로켓 전체 그룹을 만든다.
 * @param {object} spec  data/falconHeavy.js 형식
 * @returns {{
 *   root: THREE.Group,                       전체 로켓 (붙어 있는 단들)
 *   stageGroups: Map<string, THREE.Group>,   단 id → 그 단의 그룹 (payload 포함)
 *   flames: Map<string, THREE.Group>,        단 id → 화염
 *   update: (sim: object) => void,           연소 상태에 따라 화염 표시
 *   heightUnits: number,                     로켓 전체 높이 (화면 단위)
 * }}
 */
export function createRocketModel(spec) {
  const root = new THREE.Group();
  const stageGroups = new Map();
  const flames = new Map();
  let top = 0;

  for (const part of spec.geometry.parts) {
    if (!stageGroups.has(part.stageId)) {
      const g = new THREE.Group();
      g.name = part.stageId;
      stageGroups.set(part.stageId, g);
      root.add(g);
    }
    const mesh = makePart(part);
    mesh.userData.partId = part.partId;
    stageGroups.get(part.stageId).add(mesh);
    top = Math.max(top, (part.position[1] + part.size[1] / 2) / S);
  }

  // 단별 화염: 그 단의 가장 아래 부품 바닥에 붙인다
  for (const stage of spec.stages) {
    const parts = spec.geometry.parts.filter((p) => p.stageId === stage.id);
    if (parts.length === 0) continue;
    const lowest = parts.reduce((a, b) => (a.position[1] - a.size[1] / 2 < b.position[1] - b.size[1] / 2 ? a : b));
    const flame = makeFlame(lowest.size[0]);
    flame.position.set(lowest.position[0] / S, (lowest.position[1] - lowest.size[1] / 2) / S, lowest.position[2] / S);
    flame.userData.flameOf = stage.id;
    flame.userData.flameHome = flame.position.clone();
    stageGroups.get(stage.id).add(flame);
    flames.set(stage.id, flame);
  }

  let flicker = 0;
  function update(sim) {
    flicker += 0.35;
    const altitude = sim.getAltitude();
    for (const s of sim.stages) {
      const flame = flames.get(s.id);
      if (!flame) continue;
      if (s.attached) flame.visible = s.burning;   // 분리된 단의 화염은 launchController가 착륙 연소에 맞춰 켠다
      if (flame.visible) {
        const throttle = s.attached ? (s.throttleWhileBoosters ?? 1) : 0.5;
        shapeFlame(flame, flicker + s.id.length, altitude, throttle);
      } else {
        const p = flame.userData.parts;
        if (p) p.light.intensity = 0;
      }
    }
  }

  /**
   * 단을 로켓에서 떼어 장면의 독립 물체로 만든다 (12단계).
   * 세계 좌표계의 위치·회전을 유지한 채 부모를 scene으로 바꾼다.
   * @param {string} stageId
   * @param {THREE.Scene} scene
   * @returns {THREE.Group | null}
   */
  function detachStage(stageId, scene) {
    const group = stageGroups.get(stageId);
    if (!group || group.parent !== root) return null;
    scene.attach(group);   // 세계 변환 유지
    // 분리된 단의 국소 원점은 발사대 기준이므로, 물체 위치를 단의 중심에 맞추기 위해 자식들을 되돌려 놓는다
    const center = new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(group);
    box.getCenter(center);
    const offset = group.worldToLocal(center.clone());
    for (const child of group.children) child.position.sub(offset);
    group.position.copy(center);
    return group;
  }

  /**
   * 떼어냈던 단들을 원래 자리에 다시 붙인다 ("처음으로").
   */
  function reassemble() {
    for (const [stageId, group] of stageGroups) {
      if (group.parent === root) continue;
      group.removeFromParent();
      group.position.set(0, 0, 0);
      group.rotation.set(0, 0, 0);
      // detachStage에서 옮긴 자식 위치를 원래대로: 부품 정의로 다시 배치
      for (const child of group.children) {
        const part = spec.geometry.parts.find((p) => p.stageId === stageId && child.userData.partId === p.partId);
        if (part) child.position.set(part.position[0] / S, part.position[1] / S, part.position[2] / S);
        else if (child.userData.flameOf) child.position.copy(child.userData.flameHome);
      }
      root.add(group);
    }
  }

  return { root, stageGroups, flames, update, detachStage, reassemble, heightUnits: top };
}
