// 3D 발사 장면의 기본 틀 (10단계)
// 역할: Three.js 렌더러, 장면, 카메라, 조명, 지구(구), 발사대를 만들고 그린다.
// 물리 계산은 하지 않는다. 로켓과 물체의 위치는 뒤 단계에서 physics/가 계산한 값을 받아 배치한다.
//
// 축척 (D-39): 물리 계산은 실제 값(m), 화면은 표시 축척을 쓴다.
//   화면 단위 1 = 실제 SCENE_METERS_PER_UNIT m. 지구 반지름은 실제 비율로 두면 로켓이 보이지 않으므로
//   화면에서는 EARTH_DISPLAY_RADIUS 로 줄이고, 발사대 근처의 땅은 카메라가 가까울 때 평평하게 보인다.

import * as THREE from '../../lib/three/three.module.js';
import { OrbitControls } from '../../lib/three/OrbitControls.js';

// 표시 축척 상수. 로켓 높이(약 70 m)가 화면에서 약 7 단위가 되도록 1 단위 = 10 m
export const SCENE_METERS_PER_UNIT = 10;
// 지구 표시 반지름 (화면 단위). 실제 6,371 km를 그대로 쓰지 않는다.
export const EARTH_DISPLAY_RADIUS = 6_000;

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
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // ---- 장면과 하늘 ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 400, 3_000);

  // ---- 카메라 ----
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 50_000);

  // ---- 지구 ----
  // 지구 중심을 (0, -EARTH_DISPLAY_RADIUS, 0)에 두어 발사대 바닥(지표면)이 y = 0 이 되게 한다
  const surfaceY = 0;
  const earthGeometry = new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS, 96, 96);
  const earthMaterial = new THREE.MeshStandardMaterial({ color: 0x2f6f4e, roughness: 0.95, metalness: 0 });
  const earth = new THREE.Mesh(earthGeometry, earthMaterial);
  earth.position.set(0, -EARTH_DISPLAY_RADIUS, 0);
  earth.receiveShadow = true;
  scene.add(earth);

  // 바다/대기 느낌의 옅은 원반(지평선 강조)
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_DISPLAY_RADIUS * 1.01, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x4a8fe0, transparent: true, opacity: 0.08, side: THREE.BackSide }),
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
  sun.position.set(300, 500, 200);
  scene.add(sun);
  const ambient = new THREE.HemisphereLight(0x8fb8ff, 0x1a2a1a, 0.6);
  scene.add(ambient);

  // ---- 별 배경 ----
  const starCount = 1500;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const r = 20_000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi));   // 하늘 쪽(위)에만
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 30, sizeAttenuation: true, fog: false }),
  );
  scene.add(stars);

  // ---- 마우스 카메라 (10단계 임시. 11단계에서 따라가기 카메라로 바뀐다) ----
  camera.position.set(28, 14, 28);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, surfaceY + 5, 0);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 2_000;
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

  function loop(now) {
    if (!running) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
    lastTime = now;
    for (const fn of frameCallbacks) fn(dt);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  return {
    scene, camera, renderer, controls, earth, launchPad, surfaceY,
    start() {
      if (running) return;
      running = true;
      lastTime = 0;
      resize();
      requestAnimationFrame(loop);
    },
    stop() { running = false; },
    onFrame(fn) { frameCallbacks.push(fn); },
  };
}
