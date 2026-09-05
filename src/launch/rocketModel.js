// 로켓 3D 형상 (11단계, 12단계에서 단별 분리 표시)
// 역할: 로켓 제원의 geometry.parts 로 단별 그룹을 만들고, 연소 중인 단에 화염을 붙인다.
// 물리 계산은 하지 않는다. 좌표는 화면 단위(1 단위 = SCENE_METERS_PER_UNIT m).

import * as THREE from '../../lib/three/three.module.js';
import { SCENE_METERS_PER_UNIT } from './launchScene.js';

const S = SCENE_METERS_PER_UNIT;

const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xe8ecf7, roughness: 0.5, metalness: 0.1 });
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x2a3557, roughness: 0.7 });
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.85 });
const flameCoreMaterial = new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.9 });

function makePart(part) {
  const [w, h] = part.size;
  let mesh;
  if (part.type === 'fairing') {
    mesh = new THREE.Mesh(new THREE.ConeGeometry((w / 2) / S, h / S, 24), bodyMaterial);
  } else {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry((w / 2) / S, (w / 2) / S, h / S, 24), bodyMaterial);
    // 아래쪽 엔진부 표시
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry((w / 2) / S, (w / 2) / S, 1.5 / S, 24), darkMaterial);
    skirt.position.y = -(h / 2) / S + 0.75 / S;
    mesh.add(skirt);
  }
  mesh.position.set(part.position[0] / S, part.position[1] / S, part.position[2] / S);
  mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
  return mesh;
}

function makeFlame(diameterM) {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry((diameterM * 0.45) / S, (diameterM * 3) / S, 16), flameMaterial);
  outer.rotation.x = Math.PI;
  outer.position.y = -(diameterM * 1.5) / S;
  const inner = new THREE.Mesh(new THREE.ConeGeometry((diameterM * 0.25) / S, (diameterM * 2) / S, 16), flameCoreMaterial);
  inner.rotation.x = Math.PI;
  inner.position.y = -(diameterM * 1.0) / S;
  group.add(outer);
  group.add(inner);
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
