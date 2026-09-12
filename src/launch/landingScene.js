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

  // 재진입 불꽃 (D-66): 대기와 부딪혀 아래쪽이 하얗게 달아오르고, 위로 긴 플라스마 꼬리가 끌린다
  const heat = new THREE.Mesh(
    new THREE.SphereGeometry(5.2, 24, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58),
    new THREE.MeshBasicMaterial({
      color: 0xfff0c0, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  heat.position.y = 1.2;
  g.add(heat);
  g.userData.heat = heat;

  // 플라스마 꼬리: 위쪽으로 길게 늘어난 원뿔 두 겹
  const trail = new THREE.Group();
  const trailOuter = new THREE.Mesh(
    new THREE.ConeGeometry(4.6, 44, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff7a33, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  trailOuter.position.y = 24;
  const trailInner = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 32, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  trailInner.position.y = 18;
  trail.add(trailOuter);
  trail.add(trailInner);
  g.add(trail);
  g.userData.trail = [trailOuter, trailInner];
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
  // 지구 착륙 지점: 발사장처럼 콘크리트 패드와 바다를 함께 둔다
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(140, 48),
    new THREE.MeshStandardMaterial({ color: 0x8a8f9c, roughness: 0.95 }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.3;
  pad.visible = false;
  scene.add(pad);

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
  let isEarth = false;
  const spaceColor = new THREE.Color(0x05070f);
  const dayColor = new THREE.Color(0x5f9fd8);
  const skyColor = new THREE.Color();
  let viewMode = 'third';
  let altitude = 0;

  function setBody(visual) {
    bodyName = visual.name;
    groundMaterial.color.set(visual.color ?? 0x8a8f9c);
    rebuildRocks(visual.color ?? 0x8a8f9c);
    const hasAir = Boolean(visual.atmosphere) && visual.kind !== 'star';
    hasAtmosphere = hasAir;
    isEarth = Boolean(visual.reentry);
    sky.material.color.set(visual.atmosphere ?? 0x000000);
    sky.material.opacity = hasAir ? 0.35 : 0;
    stars.visible = !hasAir;
    scene.background = new THREE.Color(hasAir ? (visual.reentry ? 0x05070f : 0x2a1a14) : 0x05070f);
    // 지구는 돌밭 대신 발사장 지면으로 (D-66)
    pad.visible = isEarth;
    if (isEarth) { rocks.clear(); groundMaterial.color.set(0x3b6b3f); }
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
      camera.position.set(320, Math.min(h, 900) + 160, 320);
      controls.target.set(0, Math.min(h, 700) * 0.6, 0);
    } else {
      // 고도가 높아도 카메라가 너무 멀어지지 않게 한다. 멀어지면 우주선이 점이 되어
      // 재진입 불꽃이 보이지 않는다 (18단계 수정)
      camera.fov = 52;
      const back = 34 + Math.min(h, 500) * 0.28;
      camera.position.set(back * 0.7, h + 14 + Math.min(h, 500) * 0.1, back);
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
    // 재진입 불꽃 (D-66): 고도 75~25 km 구간에서 가장 세다. 그 아래로는 사그라든다
    const heat = lander.userData.heat;
    const trail = lander.userData.trail;
    let burn = 0;
    if (descent.reentry) {
      // 대기 밀도는 고도가 낮아질수록 커지고, 속도는 낮아질수록 줄어든다.
      // 둘의 곱이 가장 큰 25~60 km 구간에서 가장 밝게 탄다
      const h = altitude / 1000;                       // km
      burn = Math.max(0, Math.min(1, Math.exp(-((h - 45) ** 2) / 620)));
      if (h > 85 || h < 12) burn = 0;
    }
    if (heat) heat.material.opacity = burn * 0.7;
    if (trail) {
      const on = burn > 0.02;
      trail[0].visible = on;
      trail[1].visible = on;
      trail[0].material.opacity = burn * 0.26;
      trail[1].material.opacity = burn * 0.4;
      const stretch = 0.5 + burn * 1.5;
      trail[0].scale.set(1, stretch, 1);
      trail[1].scale.set(1, stretch, 1);
    }

    // 하늘: 대기가 있는 천체는 고도가 낮아질수록 파랗게 진해진다 (지구는 우주의 검정 → 하늘색)
    if (hasAtmosphere) {
      const t = Math.min(altitude / 60_000, 1);        // 1 = 우주, 0 = 지면
      sky.material.opacity = 0.72 * ((1 - t) ** 2.2) + 0.05;
      stars.visible = t > 0.3;
      if (isEarth) {
        // 실제로는 30 km만 올라가도 하늘이 거의 검다. 낮은 고도에서만 빠르게 파래지게 한다
        skyColor.copy(spaceColor).lerp(dayColor, (1 - t) ** 2.4);
        scene.background = skyColor.clone();
        // 태양빛도 대기를 지나며 따뜻해진다
        sun.color.setHex(t > 0.5 ? 0xfff4e0 : 0xffe6c0);
        ambient.intensity = 0.35 + (1 - t) * 0.5;
      }
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
