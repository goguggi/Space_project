// 3D 발사 장면의 기본 틀 (10단계)
// 역할: Three.js 렌더러, 장면, 카메라, 조명, 지구(구), 발사대를 만들고 그린다.
// 물리 계산은 하지 않는다. 로켓과 물체의 위치는 뒤 단계에서 physics/가 계산한 값을 받아 배치한다.
//
// 축척 (D-39): 물리 계산은 실제 값(m), 화면은 표시 축척을 쓴다.
//   화면 단위 1 = 실제 SCENE_METERS_PER_UNIT m 로 모든 것을 같은 비율로 줄인다. 지구도 실제 비율(반지름 637,100 단위)이다.
//   그래서 물리 좌표를 나누기만 하면 화면 좌표가 되고, 곡률·각도·고도가 모두 맞는다.
//   카메라는 로켓 곁에 붙어 있으므로 로켓(7 단위)이 잘 보이고, 지구는 고도가 높아질수록 둥글게 보인다.
//   먼 거리(수십만 단위)와 가까운 거리(수 단위)를 함께 그리기 위해 로그 깊이 버퍼를 쓴다.

import * as THREE from '../../lib/three/three.module.js';
import { OrbitControls } from '../../lib/three/OrbitControls.js';
import { EARTH_RADIUS } from '../data/constants.js';

// 표시 축척 상수. 로켓 높이(약 70 m)가 화면에서 약 7 단위가 되도록 1 단위 = 10 m
export const SCENE_METERS_PER_UNIT = 10;
// 지구 표시 반지름 (화면 단위) = 실제 반지름 / 축척
export const EARTH_DISPLAY_RADIUS = EARTH_RADIUS / SCENE_METERS_PER_UNIT;

/**
 * 발사 장면을 만든다.
 * @param {HTMLElement} container  캔버스를 넣을 요소. 크기는 CSS로 정한다
 * @returns {{
 *   scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer,
 *   controls: OrbitControls, earth: THREE.Mesh, launchPad: THREE.Group,
 *   surfaceY: number,   지표면의 화면 y 좌표 (발사대 바닥)
 *   start: () => void, stop: () => void, onFrame: (fn: (dtSeconds: number) => void) => void,
 * }}
 */
export function createLaunchScene(container) {
  // ---- 렌더러 ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // ---- 장면과 하늘 ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);

  // ---- 카메라 ----
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.5, 1e7);

  // ---- 지구 ----
  // 지구 중심을 (0, -EARTH_DISPLAY_RADIUS, 0)에 두어 발사대 바닥(지표면)이 y = 0 이 되게 한다
  const surfaceY = 0;
  const earthGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS, 256, 256);
  const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6f4e, roughness: 0.95, metalness: 0 });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.position.set(0, -EARTH_DISPLAY_RADIUS, 0);
  earth.receiveShadow = true;
  scene.add(earth);

  // 바다/대기 느낌의 옅은 원반(지평선 강조)
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.015, 128, 128),
    new THREE.MeshBasicMaterial({ color: 0x4a8fe0, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }),
  );
  atmosphere.position.copy(earth.position);
  scene.add(atmosphere);

  // ---- 발사대 ----
  const launchPad = new THREE.Group();
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.6, 32),
    new THREE.MeshStandardMaterial({ color: 0x555b6e, roughness: 0.8 }),
  );
  padBase.position.y = surfaceY + 0.3;
  launchPad.add(padBase);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 9, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x9aa5c7, roughness: 0.6 }),
  );
  tower.position.set(-3.5, surfaceY + 4.5, 0);
  launchPad.add(tower);
  scene.add(launchPad);

  // ---- 조명 ----
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.position.set(0.5, 0.8, 0.3).multiplyScalar(1e6);
  scene.add(sun);
  const ambient = new THREE.HemisphereLight(0x8fb8ff, 0x1a2a1a, 0.6);
  scene.add(ambient);

  // ---- 별 배경 ----
  const starCount = 1500;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const r = 5e6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false }),
  );
  scene.add(stars);

  // ---- 마우스 카메라. 11단계부터는 followCamera가 매 프레임 회전 중심을 로켓으로 옮긴다 ----
  camera.position.set(28, 14, 28);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, surfaceY + 5, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 5_000;
  controls.update();

  // ---- 창 크기 변경 ----
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // ---- 프레임 루프 ----
  const frameCallbacks = [];
  let running = false;
  let lastTime = 0;

  // 탭이 숨겨지면 브라우저가 requestAnimationFrame을 멈춘다. 그때는 setTimeout으로 시뮬레이션만 계속 돌린다.
  function scheduleNext() {
    if (document.hidden) {
      setTimeout(() => loop(performance.now()), 1000 / 30);
    } else {
      requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    if (!running) return;
    // 프레임 사이 실제 경과 시간. 탭이 숨겨져 타이머가 1초로 제한돼도 시뮬레이션 시계가 실제 시간을 따라가도록 상한을 1초로 둔다.
    // (물리 적분은 physics/launchDynamics.js 안에서 1/60초 간격으로 나누어 하므로 정확도는 변하지 않는다)
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1.0) : 0;
    lastTime = now;
    for (const fn of frameCallbacks) fn(dt);
    controls.update();
    if (!document.hidden) renderer.render(scene, camera);
    scheduleNext();
  }

  return {
    scene, camera, renderer, controls, earth, launchPad, surfaceY,
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      resize();
      scheduleNext();
    },
    stop() { running = false; },
    onFrame(fn) { frameCallbacks.push(fn); },
  };
}
