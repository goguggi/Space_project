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
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.85 });
const flameCoreMaterial = new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.95 });

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
  // 바깥 주황 불꽃
  const outer = new THREE.Mesh(new THREE.ConeGeometry((diameterM * 0.5) / S, (diameterM * 3.6) / S, 20), flameMaterial);
  outer.rotation.x = Math.PI;
  outer.position.y = -(diameterM * 1.8) / S;
  // 안쪽 파란 심
  const inner = new THREE.Mesh(new THREE.ConeGeometry((diameterM * 0.22) / S, (diameterM * 2.2) / S, 20), flameCoreMaterial);
  inner.rotation.x = Math.PI;
  inner.position.y = -(diameterM * 1.1) / S;
  group.add(outer);
  group.add(inner);
  // 마하 디스크: 배기 흐름에 생기는 밝은 마디 세 개
  for (let i = 0; i < 3; i += 1) {
    const disk = new THREE.Mesh(
      new THREE.SphereGeometry((diameterM * (0.16 - i * 0.03)) / S, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.55 - i * 0.12 }),
    );
    disk.scale.y = 0.45;
    disk.position.y = -(diameterM * (0.9 + i * 0.7)) / S;
    group.add(disk);
  }
  group.visible = false;
  return group;
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
    for (const s of sim.stages) {
      const flame = flames.get(s.id);
      if (!flame) continue;
      if (s.attached) flame.visible = s.burning;   // 분리된 단의 화염은 launchController가 착륙 연소에 맞춰 켠다
      if (flame.visible) {
        const k = 0.9 + 0.15 * Math.sin(flicker + s.id.length);
        flame.scale.set(1, k, 1);
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
