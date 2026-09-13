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
  // 19단계 (D-74): 마우스 오른쪽 버튼으로도 시점을 돌릴 수 있게 한다. 왼쪽도 그대로 회전한다
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE,
  };
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
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

  // ---- 우주인 (20단계, D-77) ----
  function createAstronaut() {
    const g = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xeef1f8, roughness: 0.8, metalness: 0.05 });
    const trim = new THREE.MeshStandardMaterial({ color: 0xff8f3a, roughness: 0.8 });
    const visor = new THREE.MeshStandardMaterial({ color: 0x2a2f3f, roughness: 0.15, metalness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.5, 6, 14), suit);
    torso.position.y = 1.05;
    g.add(torso);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), suit);
    helmet.position.y = 1.68;
    g.add(helmet);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.245, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), visor);
    face.position.set(0, 1.7, 0.1);
    face.rotation.x = Math.PI * 0.5;
    g.add(face);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.28), trim);
    pack.position.set(0, 1.12, -0.34);
    g.add(pack);
    const limbs = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), suit);
      arm.position.set(side * 0.42, 1.02, 0);
      g.add(arm);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.52, 4, 8), suit);
      leg.position.set(side * 0.17, 0.42, 0);
      g.add(leg);
      limbs.push(arm, leg);
    }
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.045, 8, 20), trim);
    stripe.position.y = 1.32;
    stripe.rotation.x = Math.PI / 2;
    g.add(stripe);
    g.userData.limbs = limbs;
    g.visible = false;
    return g;
  }

  const astronaut = createAstronaut();
  scene.add(astronaut);

  // ---- 임무 표식과 결과물 (깃발 등) ----
  const taskMarkers = new THREE.Group();
  scene.add(taskMarkers);
  const placed = new THREE.Group();
  scene.add(placed);

  // ---- 폭발 (20단계, D-75) ----
  const debris = new THREE.Group();
  scene.add(debris);
  const fireball = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffbb55, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(fireball);
  let blastTime = -1;

  // ---- 마우스로 몸 돌리기 (20단계, D-84) ----
  // 유니티의 1인칭 조작처럼, 화면을 누르면 마우스 포인터를 잠그고 마우스 이동으로 시선을 돌린다.
  // 좌우(movementX)는 **몸의 방향(yaw)** 을 돌리고, 상하(movementY)는 고개(pitch)만 든다.
  const canvasEl = renderer.domElement;

  canvasEl.addEventListener('click', () => {
    if (evaMode && !pointerLocked) canvasEl.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvasEl;
  });
  document.addEventListener('mousemove', (e) => {
    if (!pointerLocked || !evaMode) return;
    walker.camYaw -= e.movementX * LOOK_SENSITIVITY;
    walker.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, walker.pitch - e.movementY * LOOK_SENSITIVITY));
    if (viewMode === 'first') walker.yaw = walker.camYaw;   // 1인칭은 몸이 시선을 따라간다
    updateAstronaut();
  });

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
  let gravityNow = 1.62;
  let evaMode = false;
  // ---- 우주인 캐릭터 조작 (20단계, D-84) ----
  // 일반적인 3D 게임의 캐릭터 컨트롤러와 같은 방식으로 만든다.
  //   · 마우스가 시선(camYaw·pitch)을 돌린다. 1인칭이면 몸도 곧바로 그 방향을 본다.
  //   · WASD는 **카메라가 보는 방향 기준**으로 움직인다 (앞/뒤/좌/우 스트레이프).
  //   · 속도는 즉시 바뀌지 않고 가속·감속한다. 그래서 걷기 시작과 멈춤이 부드럽다.
  //   · 3인칭에서는 몸이 실제 이동 방향으로 서서히 돌아간다.
  //   · 점프는 지면에 있을 때만. 공중에서는 조작이 약해진다(공중 제어).
  const walker = {
    x: 0, z: 12, y: 0,
    yaw: Math.PI,        // 몸이 향한 각
    camYaw: Math.PI,     // 시선(카메라)이 향한 각
    pitch: 0,            // 고개 각
    vx: 0, vz: 0, vy: 0, // 속도 (m/s)
    grounded: true,
    speed: 0,            // 수평 속도 크기 (애니메이션용)
  };
  const EYE_HEIGHT = 1.72;               // 헬멧 안 눈높이 (m)
  const PITCH_LIMIT = (78 * Math.PI) / 180;
  const LOOK_SENSITIVITY = 0.0024;
  const GROUND_ACCEL = 14;               // 지면 가속 (1/s). 클수록 즉각적
  const GROUND_DAMP = 11;                // 지면 감속
  const AIR_CONTROL = 0.28;              // 공중에서의 조작 비율
  const TURN_RATE = 9;                   // 몸이 이동 방향으로 도는 속도 (1/s)
  const CAM_FOLLOW = 12;                 // 3인칭 카메라 따라오기 (1/s)
  let bobPhase = 0;
  let landDip = 0;                       // 착지 순간 카메라가 살짝 내려앉는 양
  let pointerLocked = false;
  const camPos = new THREE.Vector3();
  const camAim = new THREE.Vector3();
  let camReady = false;

  /** 각도 차이를 −π~π로 (부드러운 회전에 쓴다) */
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

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

  function placeCamera(dt = 0.016) {
    if (evaMode) {
      const headY = walker.y + EYE_HEIGHT - landDip;
      if (viewMode === 'first') {
        // 헬멧 안: 카메라가 곧 눈. 걸을 때 살짝 위아래로 흔들린다
        controls.enabled = false;
        camera.fov = 78;
        const bob = Math.sin(bobPhase * 2) * 0.035 * Math.min(walker.speed / 2, 1);
        camera.position.set(walker.x, headY + bob, walker.z);
        camera.up.set(0, 1, 0);
        camera.rotation.order = 'YXZ';
        camera.rotation.set(walker.pitch, walker.camYaw + Math.PI, 0);
        camera.updateProjectionMatrix();
        camReady = false;
        return;
      }
      // 3인칭: 시선 방향 뒤쪽에 카메라를 두고 부드럽게 따라간다
      controls.enabled = false;
      const dist = viewMode === 'wide' ? 26 : 7.5;
      const height = viewMode === 'wide' ? 14 : 2.6;
      camera.fov = viewMode === 'wide' ? 60 : 62;
      const back = Math.cos(walker.pitch);
      camAim.set(
        walker.x - Math.sin(walker.camYaw) * dist * back,
        headY + height + Math.sin(-walker.pitch) * dist,
        walker.z - Math.cos(walker.camYaw) * dist * back,
      );
      if (!camReady) { camPos.copy(camAim); camReady = true; }
      camPos.lerp(camAim, Math.min(1, CAM_FOLLOW * dt));
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(walker.x, headY, walker.z);
      camera.updateProjectionMatrix();
      return;
    }
    camReady = false;
    controls.enabled = true;
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

  let lastFrame = 0;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;

    // 폭발: 불덩이가 부풀며 사라지고 파편이 흩어진다
    if (blastTime >= 0) {
      blastTime += dt;
      const t = Math.min(blastTime / 1.6, 1);
      fireball.scale.setScalar(2 + t * 26);
      fireball.material.opacity = (1 - t) * 0.85;
      for (const piece of debris.children) {
        piece.userData.v.y -= gravityNow * dt;
        piece.position.addScaledVector(piece.userData.v, dt);
        piece.rotation.x += piece.userData.spin * dt;
        piece.rotation.z += piece.userData.spin * 0.7 * dt;
        if (piece.position.y < 0.3) { piece.position.y = 0.3; piece.userData.v.multiplyScalar(0); }
      }
    }

    // OrbitControls는 enabled가 false여도 update()가 카메라를 제 자리로 되돌린다.
    // 1인칭 탐사에서는 카메라를 직접 다루므로 부르지 않는다 (20단계 수정)
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
  }

  /** 착륙 실패: 착륙선을 숨기고 불덩이와 파편을 뿌린다 (D-75) */
  function explode(gravity = 1.62) {
    gravityNow = gravity;
    lander.visible = false;
    fireball.position.set(0, 4, 0);
    blastTime = 0;
    debris.clear();
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa2b4, roughness: 0.8, metalness: 0.4 });
    const hot = new THREE.MeshBasicMaterial({ color: 0xff8a3a });
    for (let i = 0; i < 34; i += 1) {
      const size = 0.4 + Math.random() * 1.5;
      const piece = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), i % 5 === 0 ? hot : mat);
      piece.position.set(0, 5, 0);
      const a = Math.random() * Math.PI * 2;
      const up = 6 + Math.random() * 16;
      const out = 4 + Math.random() * 22;
      piece.userData.v = new THREE.Vector3(Math.cos(a) * out, up, Math.sin(a) * out);
      piece.userData.spin = (Math.random() - 0.5) * 6;
      debris.add(piece);
    }
    placeCamera();
  }

  /** 폭발·EVA 흔적을 지우고 착륙선을 되돌린다 */
  function resetScene() {
    blastTime = -1;
    fireball.material.opacity = 0;
    debris.clear();
    placed.clear();
    taskMarkers.clear();
    lander.visible = true;
    astronaut.visible = false;
    evaMode = false;
  }

  /**
   * 이륙 (20단계, D-80): 착륙의 반대. 지표에서 솟아오른다.
   * 착륙 다리를 접고 엔진을 최대로 켠 채 고도가 올라간다.
   * @param {{ altitude: number, speed: number }} rise
   */
  function setLiftoff(rise) {
    evaMode = false;
    astronaut.visible = false;
    lander.visible = true;
    altitude = Math.max(rise.altitude, 0);
    lander.position.y = altitude;
    const flame = lander.userData.flame;
    if (flame) {
      flame.visible = true;
      flame.scale.setScalar(1.5 + Math.min(altitude / 600, 1.4));
      flame.material.opacity = 0.9;
    }
    // 다리는 이륙 직후 접힌다
    const folded = altitude > 40;
    for (const leg of legs) {
      leg.mesh.rotation.z = folded ? leg.closedZ : leg.openZ;
      leg.mesh.rotation.x = folded ? leg.closedX : leg.openX;
    }
    for (const pad of pads) pad.visible = !folded;
    // 하늘은 올라갈수록 다시 어두워진다 (대기가 있는 천체)
    if (hasAtmosphere) {
      const t = Math.min(altitude / 60_000, 1);
      sky.material.opacity = 0.72 * ((1 - t) ** 2.2) + 0.05;
      stars.visible = t > 0.3;
    }
    placeCamera();
  }

  /** 탐사 시작: 우주인을 착륙선 옆에 세우고 임무 표식을 놓는다 (D-77) */
  function startEva(tasks, gravity) {
    gravityNow = gravity;
    evaMode = true;
    astronaut.visible = true;
    walker.x = 0;
    walker.z = 12;
    walker.y = 0;
    walker.vy = 0;
    walker.yaw = Math.PI;      // 착륙선을 바라보고 시작한다
    walker.pitch = 0;
    taskMarkers.clear();
    for (const task of tasks) {
      const marker = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(task.radius - 0.5, task.radius, 32),
        new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      marker.add(ring);
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 14, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
      );
      beam.position.y = 7;
      marker.add(beam);
      marker.position.set(task.at.x, 0, task.at.z);
      marker.userData.taskId = task.id;
      taskMarkers.add(marker);
    }
    updateAstronaut();
    placeCamera();
  }

  /** 임무를 마쳤을 때: 표식을 지우고 결과물(깃발 등)을 남긴다 */
  function completeTask(task) {
    for (const m of [...taskMarkers.children]) {
      if (m.userData.taskId === task.id) taskMarkers.remove(m);
    }
    if (task.id === 'flag') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 8),
        new THREE.MeshStandardMaterial({ color: 0xdfe6f5, roughness: 0.5, metalness: 0.4 }));
      pole.position.set(task.at.x, 1.7, task.at.z);
      placed.add(pole);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x6fa8ff, roughness: 0.9, side: THREE.DoubleSide }));
      cloth.position.set(task.at.x + 0.78, 2.85, task.at.z);
      placed.add(cloth);
    } else if (task.id.startsWith('sample')) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x4fd1a0, roughness: 0.7 }));
      box.position.set(task.at.x, 0.3, task.at.z);
      placed.add(box);
    } else if (task.id === 'photo') {
      const tripod = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.4, 3),
        new THREE.MeshStandardMaterial({ color: 0x39415e, roughness: 0.8 }));
      tripod.position.set(task.at.x, 0.7, task.at.z);
      placed.add(tripod);
    }
  }

  /** 우주인 위치·자세 반영 */
  function updateAstronaut() {
    astronaut.position.set(walker.x, walker.y, walker.z);
    astronaut.rotation.y = walker.yaw;
    // 1인칭에서는 카메라가 헬멧 안에 있으므로 머리와 얼굴판을 감춘다
    const inside = evaMode && viewMode === 'first';
    for (const child of astronaut.children) {
      const isHead = Math.abs(child.position.y - 1.68) < 0.05 || Math.abs(child.position.y - 1.7) < 0.05;
      if (isHead) child.visible = !inside;
    }
  }

  /**
   * 캐릭터 한 프레임. main.js가 입력과 시간 간격을 준다.
   * @param {{ forward: number, strafe: number, turn: number, jump: boolean, run: boolean }} input
   *   forward/strafe: −1 ~ 1 (카메라 기준), turn: 방향키로 시선 돌리기, jump/run: 눌림 여부
   * @param {number} dt   초
   * @param {{ walkSpeed: number, jumpSpeed: number }} params  천체 중력에 맞춘 값
   */
  function stepWalk(input, dt, params) {
    if (!evaMode || dt <= 0) return walker;

    // ---- 시선: 방향키로도 돌릴 수 있다 (마우스를 안 쓰는 사람을 위해) ----
    if (input.turn) {
      walker.camYaw += input.turn * 2.2 * dt;
      if (viewMode === 'first') walker.yaw = walker.camYaw;
    }

    // ---- 가고 싶은 방향 (카메라 기준) ----
    const mag = Math.hypot(input.forward, input.strafe);
    const targetSpeed = params.walkSpeed * (input.run ? 1.9 : 1);
    let wishX = 0;
    let wishZ = 0;
    if (mag > 0.01) {
      const fx = Math.sin(walker.camYaw);
      const fz = Math.cos(walker.camYaw);
      // 오른쪽 방향은 앞 방향을 −90° 돌린 것
      const rx = Math.sin(walker.camYaw - Math.PI / 2);
      const rz = Math.cos(walker.camYaw - Math.PI / 2);
      const nf = input.forward / mag;
      const ns = input.strafe / mag;
      wishX = (fx * nf - rx * ns) * targetSpeed;
      wishZ = (fz * nf - rz * ns) * targetSpeed;
    }

    // ---- 가속·감속 (즉시 최고 속도가 되지 않는다) ----
    const control = walker.grounded ? 1 : AIR_CONTROL;
    const rate = (mag > 0.01 ? GROUND_ACCEL : GROUND_DAMP) * control;
    const k = 1 - Math.exp(-rate * dt);      // 시간 간격이 달라도 같은 느낌이 되도록
    walker.vx += (wishX - walker.vx) * k;
    walker.vz += (wishZ - walker.vz) * k;

    // ---- 점프와 중력 ----
    if (input.jump && walker.grounded) {
      walker.vy = params.jumpSpeed;
      walker.grounded = false;
    }
    walker.vy -= gravityNow * dt;
    walker.y += walker.vy * dt;
    if (walker.y <= 0) {
      if (!walker.grounded) landDip = Math.min(0.22, Math.abs(walker.vy) * 0.03);   // 착지 반동
      walker.y = 0;
      walker.vy = 0;
      walker.grounded = true;
    }

    // ---- 위치 ----
    const limit = GROUND_RADIUS * 0.9;
    walker.x = Math.max(-limit, Math.min(limit, walker.x + walker.vx * dt));
    walker.z = Math.max(-limit, Math.min(limit, walker.z + walker.vz * dt));
    walker.speed = Math.hypot(walker.vx, walker.vz);

    // ---- 몸의 방향 ----
    if (viewMode === 'first') {
      walker.yaw = walker.camYaw;
    } else if (walker.speed > 0.15) {
      // 3인칭: 실제 가는 쪽으로 몸이 서서히 돌아간다
      const moveYaw = Math.atan2(walker.vx, walker.vz);
      walker.yaw += angleDelta(moveYaw, walker.yaw) * Math.min(1, TURN_RATE * dt);
    }

    // ---- 걸음 애니메이션과 머리 흔들림 ----
    const stride = walker.grounded ? walker.speed / Math.max(params.walkSpeed, 0.1) : 0;
    bobPhase += dt * (4.5 + stride * 5.5);
    const swing = Math.sin(bobPhase) * 0.55 * stride;
    astronaut.userData.limbs.forEach((limb, i) => { limb.rotation.x = swing * (i % 2 ? -1 : 1); });
    if (!walker.grounded) {
      // 공중에서는 팔다리를 모은다
      astronaut.userData.limbs.forEach((limb) => { limb.rotation.x = -0.35; });
    }
    landDip = Math.max(0, landDip - dt * 0.9);

    updateAstronaut();
    placeCamera(dt);
    return walker;
  }

  return {
    setBody,
    setDescent,
    setCameraMode,
    explode,
    setLiftoff,
    resetScene,
    startEva,
    completeTask,
    stepWalk,
    /** 마우스 잠금 해제 (다른 화면으로 넘어갈 때) */
    releaseLook() { if (pointerLocked) document.exitPointerLock?.(); },
    get walker() { return walker; },
    get pointerLocked() { return pointerLocked; },
    get isEva() { return evaMode; },
    get bodyName() { return bodyName; },
    show() { renderer.domElement.style.display = 'block'; resize(); },
    hide() { renderer.domElement.style.display = 'none'; },
    start() { if (running) return; running = true; resize(); requestAnimationFrame(loop); },
    stop() { running = false; },
  };
}
