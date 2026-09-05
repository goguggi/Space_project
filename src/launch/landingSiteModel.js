// 착륙장과 무인선 3D 모델 (13단계)
// 역할: 발사대에서 진행 방향으로 잰 거리(m)에 착륙장(육지) 또는 무인선(바다)을 놓는다.
// 지구가 실제 비율의 구이므로, 거리 s에 해당하는 각도 φ = s / R 로 구 표면 위 위치를 구한다.

import * as THREE from '../../lib/three/three.module.js';
import { SCENE_METERS_PER_UNIT, EARTH_DISPLAY_RADIUS } from './launchScene.js';
import { EARTH_RADIUS } from '../data/constants.js';

const S = SCENE_METERS_PER_UNIT;

/**
 * 진행 방향 거리 s(m)의 지표면 점을 화면 좌표로 바꾼다. 발사대는 (0, 0, 0)
 */
export function groundPointToScene(downrangeM) {
  const phi = downrangeM / EARTH_RADIUS;
  return new THREE.Vector3(
    EARTH_DISPLAY_RADIUS * Math.sin(phi),
    EARTH_DISPLAY_RADIUS * Math.cos(phi) - EARTH_DISPLAY_RADIUS,
    0,
  );
}

function alignToSurface(object, downrangeM) {
  // 지표면 법선 방향으로 세운다 (발사 평면 안에서 z축 회전)
  object.rotation.z = -(downrangeM / EARTH_RADIUS);
}

/**
 * 육지 착륙장: 둥근 콘크리트 패드와 "X" 표시
 */
export function createLandingPad(downrangeM, label = '착륙장') {
  const group = new THREE.Group();
  group.name = `landing-pad-${label}`;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(40 / S, 40 / S, 1 / S, 40),
    new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.9 }),
  );
  pad.position.y = 0.5 / S;
  group.add(pad);
  const mark = new THREE.Mesh(
    new THREE.RingGeometry(12 / S, 18 / S, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide }),
  );
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = 1.1 / S;
  group.add(mark);
  group.position.copy(groundPointToScene(downrangeM));
  alignToSurface(group, downrangeM);
  return group;
}

/**
 * 바다 위 무인선: 납작한 갑판과 주변의 바다 원반
 */
export function createDroneShip(downrangeM, label = '무인선') {
  const group = new THREE.Group();
  group.name = `drone-ship-${label}`;
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(3_000 / S, 48),
    new THREE.MeshStandardMaterial({ color: 0x1d4e89, roughness: 0.4, metalness: 0.1 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.2 / S;
  group.add(sea);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(90 / S, 3 / S, 50 / S),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.8 }),
  );
  deck.position.y = 1.5 / S;
  group.add(deck);
  const mark = new THREE.Mesh(
    new THREE.RingGeometry(10 / S, 15 / S, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide }),
  );
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = 3.2 / S;
  group.add(mark);
  group.position.copy(groundPointToScene(downrangeM));
  alignToSurface(group, downrangeM);
  return group;
}
