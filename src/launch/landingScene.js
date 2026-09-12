// 천체 착륙 장면 (17단계, D-61)
// 역할: 달·화성처럼 고체 표면이 있는 천체에 우주선이 내려앉는 장면. 착륙 진행률 t(0~1)로 구동된다.
// 물리 계산은 하지 않는다. `physics/landingGuidance.js`의 `descentProfile`이 준 고도·속도를 받아 그린다.
//
// 지표는 실제 축척이 아니라 "우주선 주변 수백 m"를 보여 주는 국소 장면이다. 천체마다
// `data/celestialBodies.js`의 색을 쓰고, 대기가 있는 천체(화성)는 하늘을 옅게 물들인다.

import * as THREE from '../../lib/three/three.module.js';
import { OrbitControls } from '../../lib/three/OrbitControls.js';

// 화면 단위 1 = 1 m (국소 장면이라 실제 축척을 그대로 쓴다)
const GROUND_RADIUS = 900;
const ROCK_COUNT = 90;

function createLander() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 9, 24),
    new THREE.MeshStandardMaterial({ color: 0xe8ecf7, roughness: 0.45, metalness: 0.35 }),
  );
  body.position.y = 6.5;
  g.add(body);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 3.4, 24),
    new THREE.MeshStandardMaterial({ color: 0xdfe6f5, roughness: 0.45, metalness: 0.3 }),
  );
  nose.position.y = 12.7;
  g.add(nose);
  // 착륙 다리 네 개. 처음에는 접혀 있고, 절차를 수행하면 펼쳐진다 (D-67)
  g.userData.legs = [];
  g.userData.pads = [];
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 5.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3557, roughness: 0.7 }),
    );
    leg.position.set(Math.cos(angle) * 2.4, 2.4, Math.sin(angle) * 2.4);
    const openZ = Math.cos(angle) * 0.42;
    const openX = -Math.sin(angle) * 0.42;
    leg.rotation.z = 0;
    leg.rotation.x = 0;
    g.add(leg);
    g.userData.legs.push({ mesh: leg, openZ, openX, closedZ: 0, closedX: 0 });
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x3a4670, roughness: 0.8 }),
    );
    pad.position.set(Math.cos(angle) * 3.6, 0.25, Math.sin(angle) * 3.6);
    pad.visible = false;
    g.add(pad);
    g.userData.pads.push(pad);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 8, 18),
    new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.85 }),
  );
  flame.rotation.x = Math.PI;
  flame.position.y = -2.2;
  g.add(flame);
  g.userData.flame = flame;

  // 재진입 불꽃 (D-66): 대기와 부딪혀 아래쪽이 주황빛으로 달아오른다
  const heat = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 20, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
    new THREE.MeshBasicMaterial({ color: 0xff7a33, transparent: true, opacity: 0.0, side: THREE.DoubleSide }),
  );
  heat.position.y = 1.4;
  g.add(heat);
  g.userData.heat = heat;
  return g;
}

/**
 * @param {HTMLElement} container
 * @returns {object}
 */
export function createLandingScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  renderer.domElement.style.display = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.5, 40_000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 2_000;

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
  sun.position.set(300, 500, -200);
  scene.add(sun);
  const ambient = new THREE.HemisphereLight(0x8fb8ff, 0x241a12, 0.35);
  scene.add(ambient);

  // ---- 지표 ----
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xb9b6ad, roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND_RADIUS, 80), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 돌과 크레이터 (같은 색을 밝기만 바꿔 흩뿌린다)
  const rocks = new THREE.Group();
  scene.add(rocks);
  function rebuildRocks(color) {
    rocks.clear();
    const base = new THREE.Color(color);
    for (let i = 0; i < ROCK_COUNT; i += 1) {
      const r = 18 + Math.random() * (GROUND_RADIUS * 0.85);
      const a = Math.random() * Math.PI * 2;
      const size = 0.6 + Math.random() * 4.5;
      const shade = base.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.22);
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        new THREE.MeshStandardMaterial({ color: shade, roughness: 1 }),
      );
      rock.position.set(Math.cos(a) * r, size * 0.45, Math.sin(a) * r);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rocks.add(rock);
    }
  }

  // ---- 별 ----
  const starPositions = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random());        // 위쪽 반구에만
    const r = 20_000;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false }),
  );
  scene.add(stars);

  // 대기가 있는 천체의 하늘빛
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(18_000, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xd9a07a, side: THREE.BackSide, transparent: true, opacity: 0 }),
  );
  scene.add(sky);

  const lander = createLander();
  scene.add(lander);
  const legs = lander.userData.legs;
  const pads = lander.userData.pads;

  let bodyName = '목적지';
  let hasAtmosphere = false;
  let viewMode = 'third';
  let altitude = 0;

  function setBody(visual) {
    bodyName = visual.name;
    groundMaterial.color.set(visual.color ?? 0x8a8f9c);
    rebuildRocks(visual.color ?? 0x8a8f9c);
    const hasAir = Boolean(visual.atmosphere) && visual.kind !== 'star';
    hasAtmosphere = hasAir;
    sky.material.color.set(visual.atmosphere ?? 0x000000);
    sky.material.opacity = hasAir ? 0.35 : 0;
    stars.visible = !hasAir;
    scene.background = new THREE.Color(hasAir ? (visual.reentry ? 0x0a1a3a : 0x2a1a14) : 0x05070f);
  }

  function placeCamera() {
    const h = altitude;
    if (viewMode === 'first') {
      // 조종석에서 앞아래를 내려다본다. 똑바로 아래만 보면 지면만 가득 차 하얗게 보인다
      camera.fov = 76;
      camera.position.set(0, h + 11, 0);
      controls.target.set(90, h - 34, 0);
    } else if (viewMode === 'wide') {
      camera.fov = 55;
      camera.position.set(320, Math.max(h * 0.9, 60) + 120, 320);
      controls.target.set(0, Math.min(h, 200) * 0.5, 0);
    } else {
      camera.fov = 52;
      const back = 34 + h * 0.35;
      camera.position.set(back * 0.7, h + 16 + h * 0.12, back);
      controls.target.set(0, h + 6, 0);
    }
    camera.up.set(0, 1, 0);
    camera.updateProjectionMatrix();
    controls.update();
  }

  function setCameraMode(id) {
    viewMode = id === 'first' || id === 'wide' ? id : 'third';
    placeCamera();
  }

  /**
   * @param {{ altitude: number, speed: number, thrust: number, legsOut?: boolean, reentry?: boolean }} descent
   */
  function setDescent(descent) {
    altitude = Math.max(descent.altitude, 0);
    lander.position.y = altitude;
    const flame = lander.userData.flame;
    if (flame) {
      flame.visible = descent.thrust > 0.01;
      flame.scale.setScalar(0.4 + descent.thrust * 1.3);
      flame.material.opacity = 0.35 + descent.thrust * 0.5;
    }
    // 착륙 다리: 절차를 수행하기 전에는 접혀 있다 (D-67)
    for (const leg of legs) {
      leg.mesh.rotation.z = descent.legsOut ? leg.openZ : leg.closedZ;
      leg.mesh.rotation.x = descent.legsOut ? leg.openX : leg.closedX;
    }
    for (const pad of pads) pad.visible = Boolean(descent.legsOut);
    // 재진입 불꽃: 고도 80~30 km 구간에서 가장 밝다 (D-66)
    const heat = lander.userData.heat;
    if (heat) {
      const on = descent.reentry && altitude > 25_000;
      heat.material.opacity = on ? Math.min(0.85, (altitude - 25_000) / 55_000 + 0.15) : 0;
    }
    // 하늘: 대기가 있는 천체는 고도가 낮아질수록 진해진다
    if (hasAtmosphere) {
      const t = Math.min(altitude / 40_000, 1);
      sky.material.opacity = 0.55 * (1 - t) + 0.1;
      stars.visible = t > 0.35;
    }
    placeCamera();
  }

  let running = false;
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  }

  return {
    setBody,
    setDescent,
    setCameraMode,
    get bodyName() { return bodyName; },
    show() { renderer.domElement.style.display = 'block'; resize(); },
    hide() { renderer.domElement.style.display = 'none'; },
    start() { if (running) return; running = true; resize(); requestAnimationFrame(loop); },
    stop() { running = false; },
  };
}
