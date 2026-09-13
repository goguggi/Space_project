// 우주 항행 3D 장면 (15단계)
// 역할: 2단 분리 뒤 우주선이 목적지까지 날아가는 장면. 진행률 하나로 구동된다.
// 물리 계산은 하지 않는다. `physics/journey.js`가 준 거리·각반지름·도플러·광행차 값을 받아 그리기만 한다.
//
// 어떻게 아주 먼 거리를 그리는가 (D-53):
//   달(38만 km)부터 안드로메다(250만 광년)까지 실제 축척으로 그릴 수는 없다.
//   그래서 "겉보기 크기"만 맞춘다. 카메라에서 일정 거리(VIEW_DISTANCE) 앞에 천체를 두고,
//   그 반지름을 R_화면 = VIEW_DISTANCE · tan(θ) 로 정한다. θ는 실제 각반지름 atan(R/d)이다.
//   그래서 화면에서 커지는 속도가 실제로 다가갈 때와 똑같다. 지구도 같은 방법으로 뒤쪽에 둔다.
//
// 속도 연출 (실제 물리, physics/journey.js):
//   - 광행차: 빠를수록 별이 진행 방향 앞으로 몰린다. β가 바뀔 때 별 위치를 다시 계산한다.
//   - 도플러: 앞쪽 별은 파랗게, 뒤쪽 별은 붉게 물든다.
//   - 별 늘어짐(워프 선)의 길이는 β에 비례한다. 11 km/s(β ≈ 3.7×10⁻⁵)에서는 사실상 점으로 보인다.

import * as THREE from '../../lib/three/three.module.js';
import { OrbitControls } from '../../lib/three/OrbitControls.js';
import { angularRadius, dopplerFactor, aberratedAngle } from '../physics/journey.js';
import { displayRadius } from '../data/celestialBodies.js';
import { createInterior } from './interior.js';
import { createSpacecraft } from './spacecraftModel.js';

// 카메라에서 천체까지의 화면상 거리 (화면 단위). 이 거리에 겉보기 크기를 맞춘다
const VIEW_DISTANCE = 1_000;
// 천체가 화면을 완전히 덮은 뒤로는 더 키우지 않는다
const MAX_DISPLAY_RADIUS = VIEW_DISTANCE * 6;
const STAR_COUNT = 2_600;
const STAR_SHELL = 40_000;

/** 방사형 그라데이션 원판 텍스처 (별빛·성운에 쓴다). 외부 이미지 없이 캔버스로 만든다 */
function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace('1)', '0.55)'));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 가로 줄무늬 텍스처 (목성·토성). 색을 밝기만 바꿔 가며 띠를 그린다 */
function makeBandTexture(baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const base = new THREE.Color(baseColor);
  for (let y = 0; y < 128; y += 1) {
    const wave = Math.sin(y * 0.34) * 0.10 + Math.sin(y * 0.11) * 0.06;
    const c = base.clone().offsetHSL(0, 0, wave);
    ctx.fillStyle = `#${c.getHexString()}`;
    ctx.fillRect(0, y, 8, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 천체 하나를 만든다. 반지름 1의 표준 크기로 만들고, 배치할 때 scale로 크기를 맞춘다.
 * @param {object} visual  data/celestialBodies.js 항목
 */
function createBodyModel(visual) {
  const group = new THREE.Group();
  group.name = `body-${visual.name}`;
  const color = visual.color ?? 0x8a8f9c;

  if (visual.kind === 'star') {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshBasicMaterial({ color }),
    );
    group.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
      color: visual.glow ?? color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    halo.scale.setScalar((visual.glowScale ?? 3) * 2);
    group.add(halo);
    return group;
  }

  if (visual.kind === 'nebula' || visual.kind === 'galaxy') {
    // 성운·은하는 속이 비치는 구름. 스프라이트 여러 장을 겹쳐 부피감을 낸다
    const cloudTexture = makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    const count = visual.kind === 'galaxy' ? 26 : 18;
    for (let i = 0; i < count; i += 1) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTexture,
        color: i % 3 === 0 ? (visual.glow ?? color) : color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      if (visual.disk || visual.kind === 'galaxy') {
        // 나선 원반: 각도를 따라가며 반지름이 커지는 팔 모양
        const arm = (i % 2) * Math.PI;
        const t = (i / count) * 3.2;
        const r = 0.15 + t * 0.28;
        sprite.position.set(Math.cos(t * 1.6 + arm) * r, (Math.random() - 0.5) * 0.08, Math.sin(t * 1.6 + arm) * r);
        sprite.scale.setScalar(0.5 + Math.random() * 0.5);
      } else {
        sprite.position.set(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.6,
        );
        sprite.scale.setScalar(0.7 + Math.random() * 0.9);
      }
      group.add(sprite);
    }
    const core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTexture, color: visual.glow ?? color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    core.scale.setScalar(visual.kind === 'galaxy' ? 0.9 : 1.4);
    group.add(core);
    return group;
  }

  // 행성·위성
  const material = visual.bands
    ? new THREE.MeshStandardMaterial({ map: makeBandTexture(color), roughness: 0.9, metalness: 0 })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
  group.add(sphere);

  if (visual.atmosphere) {
    const air = new THREE.Mesh(
      new THREE.SphereGeometry(1.02, 48, 48),
      new THREE.MeshBasicMaterial({
        color: visual.atmosphere, transparent: true, opacity: 0.16,
        side: THREE.BackSide, depthWrite: false,
      }),
    );
    group.add(air);
  }

  if (visual.ring) {
    const inner = visual.ring.innerM / visual.radiusM;
    const outer = visual.ring.outerM / visual.radiusM;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 96),
      new THREE.MeshBasicMaterial({
        color: visual.ring.color, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2 - 0.42;   // 살짝 기울여 고리가 보이게
    group.add(ring);
  }
  return group;
}

/**
 * 항행 장면을 만든다. 목적지가 바뀌면 `setDestination`으로 천체만 갈아 끼운다.
 * @param {HTMLElement} container  캔버스를 넣을 요소
 * @returns {object}
 */
export function createCruiseScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || 800, container.clientHeight || 600);
  renderer.domElement.className = 'cruise-canvas';
  renderer.domElement.style.display = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050f);

  const camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 2_000_000);
  camera.position.set(0, 3, -26);
  camera.lookAt(0, 0, VIEW_DISTANCE);

  const controls = new OrbitControls(camera, renderer.domElement);
  // 19단계 (D-74): 마우스 오른쪽 버튼으로도 시점을 돌릴 수 있게 한다. 왼쪽도 그대로 회전한다
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE,
  };
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  controls.target.set(0, 0, 40);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 400;
  controls.update();

  // ---- 조명: 태양 쪽에서 오는 빛 + 아주 약한 환경광 ----
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
  sun.position.set(0.4, 0.7, -0.5).multiplyScalar(10_000);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x5570aa, 0.35));

  // ---- 별 배경 ----
  // 기준 방향(광행차를 적용하기 전 위치)을 따로 보관해 두고, β가 바뀔 때마다 다시 계산한다
  const baseDirections = [];
  for (let i = 0; i < STAR_COUNT; i += 1) {
    const theta = Math.acos(2 * Math.random() - 1);   // 진행 방향(+Z)과 이루는 각
    const phi = Math.random() * Math.PI * 2;
    baseDirections.push({ theta, phi, size: 0.6 + Math.random() * 1.6 });
  }
  const starPositions = new Float32Array(STAR_COUNT * 3);
  const starColors = new Float32Array(STAR_COUNT * 3);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    size: 1.9, sizeAttenuation: false, vertexColors: true, transparent: true,
  }));
  scene.add(stars);

  // 워프 선: 별과 같은 방향에 놓인 짧은 선. 길이는 β에 비례한다
  const streakPositions = new Float32Array(STAR_COUNT * 6);
  const streakColors = new Float32Array(STAR_COUNT * 6);
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  streakGeometry.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));
  const streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending,
  }));
  streaks.visible = false;
  scene.add(streaks);

  const warm = new THREE.Color(0xff9a6a);   // 붉게 (뒤쪽, 도플러 적색이동)
  const cool = new THREE.Color(0x9fc8ff);   // 파랗게 (앞쪽, 청색이동)
  const white = new THREE.Color(0xffffff);
  const tmp = new THREE.Color();

  let currentBeta = -1;

  /** 광행차와 도플러를 반영해 별 위치·색을 다시 계산한다 */
  function updateStars(betaValue) {
    if (Math.abs(betaValue - currentBeta) < 1e-4) return;
    currentBeta = betaValue;
    // 늘어짐의 각 크기 (rad). β에 비례하며, 0.99c에서 약 15°까지 뻗는다
    const streakSpread = 0.26 * Math.min(betaValue, 0.99);
    streaks.visible = streakSpread > 0.004;

    for (let i = 0; i < STAR_COUNT; i += 1) {
      const { theta, phi } = baseDirections[i];
      const t = aberratedAngle(theta, betaValue);      // 진행 방향으로 몰린 각
      const sin = Math.sin(t);
      const x = STAR_SHELL * sin * Math.cos(phi);
      const y = STAR_SHELL * sin * Math.sin(phi);
      const z = STAR_SHELL * Math.cos(t);
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      // 도플러: 앞쪽(cos t > 0)은 청색, 뒤쪽은 적색. 세기는 인자의 로그에 비례
      const factor = dopplerFactor(betaValue, Math.cos(t) >= 0);
      const shift = Math.min(Math.abs(Math.log(factor)) * 0.8, 1);
      tmp.copy(white).lerp(factor >= 1 ? cool : warm, shift);
      starColors[i * 3] = tmp.r;
      starColors[i * 3 + 1] = tmp.g;
      starColors[i * 3 + 2] = tmp.b;

      // 워프 선: 별이 실제로 흘러가는 방향(각 θ′가 커지는 쪽 = 진행 방향에서 바깥으로)으로 늘린다.
      // 다가가는 동안 별은 정면에서 바깥으로 퍼져 나가므로, 그 자취가 방사형 선이 된다.
      const t2 = Math.min(t + streakSpread, Math.PI);
      const sin2 = Math.sin(t2);
      streakPositions[i * 6] = x;
      streakPositions[i * 6 + 1] = y;
      streakPositions[i * 6 + 2] = z;
      streakPositions[i * 6 + 3] = STAR_SHELL * sin2 * Math.cos(phi);
      streakPositions[i * 6 + 4] = STAR_SHELL * sin2 * Math.sin(phi);
      streakPositions[i * 6 + 5] = STAR_SHELL * Math.cos(t2);
      for (let k = 0; k < 2; k += 1) {
        streakColors[i * 6 + k * 3] = tmp.r;
        streakColors[i * 6 + k * 3 + 1] = tmp.g;
        streakColors[i * 6 + k * 3 + 2] = tmp.b;
      }
    }
    starGeometry.attributes.position.needsUpdate = true;
    starGeometry.attributes.color.needsUpdate = true;
    streakGeometry.attributes.position.needsUpdate = true;
    streakGeometry.attributes.color.needsUpdate = true;
  }
  updateStars(0);

  // ---- 우주선 ----
  // 20단계 (D-78): 심우주 탐사선 형상으로 교체
  const ship = createSpacecraft();
  // 화면 가운데는 목적지에 내주고, 우주선은 오른쪽 아래에서 진행 방향을 가리킨다
  ship.position.set(6.5, -5.2, 14);
  ship.scale.setScalar(0.5);
  ship.rotation.y = -0.55;   // 살짝 비스듬히 두어 옆모습이 보이게 한다
  scene.add(ship);

  // ---- 지구(뒤)와 목적지(앞) ----
  let earthVisual = null;
  let earthModel = null;
  let targetVisual = null;
  let targetModel = null;

  const targetMarker = createMarker(0x6fa8ff);
  targetMarker.position.z = VIEW_DISTANCE;
  targetMarker.scale.setScalar(14);
  scene.add(targetMarker);

  const earthMarker = createMarker(0x4fd1a0);
  earthMarker.position.z = -VIEW_DISTANCE;
  earthMarker.scale.setScalar(14);
  scene.add(earthMarker);

  // 천체가 아직 점만 할 때 위치를 알려 주는 표식 (고리 + 십자). 실제 크기와는 무관한 안내 표시다
  function createMarker(color) {
    const marker = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.8, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
    );
    marker.add(ring);
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
      color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    dot.scale.setScalar(0.55);
    marker.add(dot);
    return marker;
  }

  function setBody(slot, visual) {
    const old = slot === 'earth' ? earthModel : targetModel;
    if (old) {
      scene.remove(old);
      old.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    }
    const model = createBodyModel(visual);
    model.position.z = slot === 'earth' ? -VIEW_DISTANCE : VIEW_DISTANCE;
    model.visible = false;
    scene.add(model);
    if (slot === 'earth') { earthVisual = visual; earthModel = model; }
    else { targetVisual = visual; targetModel = model; }
  }

  /** 겉보기 각반지름에 맞춰 크기를 정한다. 화면 밖으로 나갈 만큼 커지면 멈춘다 */
  function placeBody(model, visual, distanceM) {
    if (!model || !visual || !Number.isFinite(distanceM)) return 0;
    const radiusM = displayRadius(visual);
    const theta = angularRadius(radiusM, Math.max(distanceM, 1));
    const displayR = Math.min(VIEW_DISTANCE * Math.tan(Math.min(theta, 1.4)), MAX_DISPLAY_RADIUS);
    model.visible = displayR > 0.35;      // 점보다 작으면 그리지 않는다
    model.scale.setScalar(Math.max(displayR, 1e-3));
    return displayR;
  }

  /** 표식은 천체가 아직 작을 때만 보인다. 천체가 커지면 서서히 사라진다 */
  function placeMarker(marker, displayR) {
    const fade = displayR < 12 ? 1 : displayR > 40 ? 0 : (40 - displayR) / 28;
    marker.visible = fade > 0.02;
    marker.traverse((o) => { if (o.material) o.material.opacity = fade * 0.8; });
    marker.scale.setScalar(Math.max(14, displayR * 1.35));
    marker.lookAt(camera.position);
  }

  // ---- 광역 시점에서 보여 줄 항로 (지구 ── 우주선 ── 목적지) ----
  const routeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -VIEW_DISTANCE), new THREE.Vector3(0, 0, VIEW_DISTANCE),
    ]),
    new THREE.LineDashedMaterial({ color: 0x6fa8ff, dashSize: 26, gapSize: 20, transparent: true, opacity: 0.5 }),
  );
  routeLine.computeLineDistances();
  routeLine.visible = false;
  scene.add(routeLine);

  // ---- 선내와 자세 조종 (20단계, D-79 / 18단계 D-68) ----
  // 선내는 장면에 고정한다. 그래야 고개를 돌릴 때 방이 함께 돌지 않는다.
  const interior = createInterior(scene);
  interior.attachReticle(camera);
  scene.add(camera);   // 조준선이 카메라의 자식이므로 카메라를 장면에 넣어야 그려진다

  const YAW_LIMIT = (160 * Math.PI) / 180;   // 선내를 둘러볼 수 있도록 넓혔다 (D-79)
  const PITCH_LIMIT = (70 * Math.PI) / 180;
  const AIM_CONE = (7 * Math.PI) / 180;   // 조준선 안으로 볼 각도
  const attitude = { yaw: 0, pitch: 0 };
  let onTarget = true;
  const forward = new THREE.Vector3();
  const toTargetDir = new THREE.Vector3(0, 0, 1);

  const clampAttitude = () => {
    attitude.yaw = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, attitude.yaw));
    attitude.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, attitude.pitch));
  };

  /** 1인칭에서 카메라 방향을 자세값으로 정한다. 카메라는 기본으로 −Z를 보므로 Y를 π 돌려 +Z를 보게 한다 */
  function applyAttitude() {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(attitude.pitch, Math.PI + attitude.yaw, 0);
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    onTarget = forward.angleTo(toTargetDir) < AIM_CONE;
  }

  // 키보드: WASD / 방향키로 자세, R로 정면 복귀
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      keys.add(k);
      if (viewMode === 'first') e.preventDefault();
    }
    if (k === 'r') { attitude.yaw = 0; attitude.pitch = 0; applyAttitude(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  function stepAttitude(dt) {
    if (viewMode !== 'first') return;
    const rate = 1.1 * dt;   // rad/s
    if (keys.has('a') || keys.has('arrowleft')) attitude.yaw += rate;
    if (keys.has('d') || keys.has('arrowright')) attitude.yaw -= rate;
    if (keys.has('w') || keys.has('arrowup')) attitude.pitch += rate;
    if (keys.has('s') || keys.has('arrowdown')) attitude.pitch -= rate;
    clampAttitude();
    applyAttitude();
  }

  // ---- 시점 모드 (17단계, D-58) ----
  // first 조종석 · third 우주선 뒤 · wide 지구·우주선·목적지를 한 화면에
  let viewMode = 'third';
  let lastFraction = 0.5;
  let lastJourney = null;   // 시점을 바꿀 때 천체 크기를 다시 잡기 위해 마지막 상태를 기억한다

  function setCameraMode(id) {
    viewMode = id === 'first' || id === 'wide' ? id : 'third';
    interior.setVisible(viewMode === 'first');
    controls.enabled = viewMode !== 'first';
    if (viewMode === 'first') {
      // 조종석 안: 카메라가 곧 조종사의 눈. OrbitControls 대신 자세값으로 방향을 정한다 (D-70)
      camera.fov = 76;
      camera.position.copy(interior.seatPosition);   // 왼쪽 좌석에 앉는다
      ship.visible = false;
      routeLine.visible = false;
      applyAttitude();
    } else if (viewMode === 'wide') {
      camera.fov = 52;
      camera.rotation.set(0, 0, 0);
      camera.position.set(-2_600, 780, 0);   // 목적지(+Z)가 화면 오른쪽에 오도록 반대편에서 본다
      controls.target.set(0, 0, 0);
      controls.minDistance = 600;
      controls.maxDistance = 9_000;
      ship.visible = true;
      routeLine.visible = true;
    } else {
      camera.fov = 55;
      camera.rotation.set(0, 0, 0);
      camera.position.set(0, 3, -26);
      controls.target.set(0, 0, 40);
      controls.minDistance = 8;
      controls.maxDistance = 400;
      ship.visible = true;
      routeLine.visible = false;
    }
    camera.updateProjectionMatrix();
    controls.update();
    applyLayout();
    refreshBodies();
  }

  /** 시점에 맞춰 우주선과 천체의 자리·크기를 다시 잡는다 */
  function applyLayout() {
    if (viewMode === 'wide') {
      // 지도처럼 본다: 지구와 목적지를 양 끝에 같은 크기로 두고, 우주선을 진행률 위치에 놓는다
      ship.scale.setScalar(46);
      ship.position.set(0, 0, -VIEW_DISTANCE + 2 * VIEW_DISTANCE * lastFraction);
      for (const [model, z] of [[earthModel, -VIEW_DISTANCE], [targetModel, VIEW_DISTANCE]]) {
        if (!model) continue;
        model.visible = true;
        model.scale.setScalar(120);
        model.position.z = z;
      }
    } else {
      ship.scale.setScalar(0.5);
      ship.position.set(6.5, -5.2, 14);
    }
  }

  /** 마지막 진행 상태로 천체 크기·표식을 다시 잡는다 (시점을 바꿔도 겉보기 크기가 맞도록) */
  function refreshBodies() {
    if (viewMode === 'wide') {
      earthMarker.visible = false;
      targetMarker.visible = false;
      applyLayout();
      return;
    }
    if (earthModel) earthModel.position.z = -VIEW_DISTANCE;
    if (targetModel) targetModel.position.z = VIEW_DISTANCE;
    if (!lastJourney) return;
    placeMarker(earthMarker, placeBody(earthModel, earthVisual, lastJourney.fromEarth));
    placeMarker(targetMarker, placeBody(targetModel, targetVisual, lastJourney.toTarget));
  }

  // ---- 프레임 루프 ----
  let running = false;
  let spin = 0;
  const frameCallbacks = [];

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
    stepAttitude(dt);
    spin += 0.0016;
    if (targetModel) targetModel.rotation.y = spin;
    if (earthModel) earthModel.rotation.y = -spin * 0.7;
    if (viewMode !== 'wide') ship.position.y = -5.2 + Math.sin(spin * 1.4) * 0.12;
    for (const fn of frameCallbacks) fn();
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
  }

  return {
    get domElement() { return renderer.domElement; },
    /** 출발지·목적지 천체를 바꾼다 */
    setBodies(earth, target) {
      setBody('earth', earth);
      setBody('target', target);
      currentBeta = -1;   // 별도 다시 계산하게 한다
      applyLayout();
    },
    /**
     * 진행 상태를 반영한다.
     * @param {{ fromEarth: number, toTarget: number }} journey  physics/journey.js 결과
     * @param {number} betaValue  v / c
     */
    setProgress(journey, betaValue) {
      lastJourney = journey;
      const span = journey.fromEarth + journey.toTarget;
      lastFraction = span > 0 ? Math.min(Math.max(journey.fromEarth / span, 0), 1) : 0;
      refreshBodies();
      updateStars(betaValue);
      for (const flame of ship.userData.flames ?? []) {
        flame.material.opacity = 0.3 + Math.min(betaValue * 3, 0.55);
        flame.scale.y = 0.7 + Math.min(betaValue * 4, 1.1);
      }
    },
    onFrame(fn) { frameCallbacks.push(fn); },
    setCameraMode,
    get cameraMode() { return viewMode; },
    /** 조종석 계기판 내용 (18단계) */
    setCockpitReadout(info) { interior.setReadout({ ...info, onTarget }); },
    /** 목적지가 조준선 안에 있는가 (D-68 보너스 판정) */
    get onTarget() { return onTarget; },
    resetAttitude() { attitude.yaw = 0; attitude.pitch = 0; applyAttitude(); },
    show() {
      renderer.domElement.style.display = 'block';
      resize();
    },
    hide() { renderer.domElement.style.display = 'none'; },
    start() {
      if (running) return;
      running = true;
      resize();
      requestAnimationFrame(loop);
    },
    stop() { running = false; },
    scene,
    camera,
    controls,
  };
}
