// 심우주 탐사선 3D 형상 (20단계 D-78, 21단계 D-94에서 확장)
// 역할: 항행 중 3인칭·광역에서 보이는 우주선을 만든다. 발사 장면에서도 페어링을 벗으면 같은 배가 나온다.
// 계산은 하지 않는다.
//
// 구성 (실제 유인 심우주선의 공통 요소):
//   기밀 모듈(승무원 공간) · 앞쪽 도킹 포트 · 트러스 척추 · **회전 거주 구역(원심 중력)** ·
//   태양전지판 3장씩 두 날개 · 고이득 접시 안테나 · 방열판 · 추진부(노즐 4기) ·
//   자세 제어 추력기 · 항법등
// 외부 모델 파일을 쓰지 않고 기본 도형만 조합한다 (저장소 원칙).
//
// 회전 거주 구역: 긴 항행에서 무중력으로 인한 근육·뼈 손실을 막으려면 원심력으로
//   인공 중력을 만들어야 한다. 반지름 r을 각속도 ω로 돌리면 바깥쪽에서 a = ω²r 의 중력을 느낀다.
//   실제 설계안들이 공통으로 쓰는 방식이라 우주선다움이 가장 잘 드러나는 부분이다.
//
// 좌표: +Z가 진행 방향, +Y가 위쪽. 전체 길이 약 30 단위.

import * as THREE from '../../lib/three/three.module.js';

/** 태양전지판 텍스처: 남색 바탕에 격자선 */
function makePanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b2a63';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = 'rgba(150, 180, 255, 0.55)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 128; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke(); }
  for (let y = 0; y <= 64; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
  // 셀 반사광
  const g = ctx.createLinearGradient(0, 0, 128, 64);
  g.addColorStop(0, 'rgba(255,255,255,0.12)');
  g.addColorStop(0.5, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 금박(다층 단열재) 느낌의 텍스처 */
function makeFoilTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i += 1) {
    const x = Math.random() * 64;
    const y = Math.random() * 64;
    ctx.strokeStyle = `rgba(255,235,180,${0.06 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 14);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 탐사선을 만든다.
 * @returns {THREE.Group}  userData.flames = [메인 화염], userData.lights = [항법등]
 */
export function createSpacecraft() {
  const ship = new THREE.Group();
  ship.name = 'spacecraft';

  const hull = new THREE.MeshStandardMaterial({ color: 0xe4e9f5, roughness: 0.38, metalness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x232a40, roughness: 0.7, metalness: 0.3 });
  const foil = new THREE.MeshStandardMaterial({ map: makeFoilTexture(), roughness: 0.45, metalness: 0.8 });
  const panelMat = new THREE.MeshStandardMaterial({
    map: makePanelTexture(), roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide,
  });
  const radiatorMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde8, roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide,
  });

  // ---- 기밀 모듈 (승무원 공간) ----
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 9, 28), hull);
  cabin.rotation.x = Math.PI / 2;
  cabin.position.z = 2;
  ship.add(cabin);

  // 창 세 개 (바깥에서 보이는 동그란 창)
  for (const [i, angle] of [-0.6, 0, 0.6].entries()) {
    const win = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20),
      new THREE.MeshBasicMaterial({ color: 0x8fd0ff }),
    );
    win.position.set(Math.sin(angle) * 2.62, 0.9, 2 + (i - 1) * 2.4);
    win.rotation.y = angle + Math.PI / 2;
    ship.add(win);
  }

  // ---- 앞쪽 원뿔과 도킹 포트 ----
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.2, 28), hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 8.6;
  ship.add(nose);
  const dock = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 1.2, 20), dark);
  dock.rotation.x = Math.PI / 2;
  dock.position.z = 11.2;
  ship.add(dock);
  const dockRing = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.16, 10, 24), hull);
  dockRing.position.z = 11.8;
  ship.add(dockRing);

  // ---- 뒤쪽 추진부 ----
  const service = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.1, 5.5, 24), foil);
  service.rotation.x = Math.PI / 2;
  service.position.z = -5.2;
  ship.add(service);

  const flames = [];
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 1.8, 14), dark);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, -8.6);
    ship.add(nozzle);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 5.5, 14),
      new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.8 }),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, -12.2);
    ship.add(flame);
    flames.push(flame);
  }

  // ---- 트러스 척추 (모듈들을 잇는 뼈대) ----
  const truss = new THREE.Group();
  for (const [dx, dy] of [[0.9, 0.9], [-0.9, 0.9], [0.9, -0.9], [-0.9, -0.9]]) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 8.5, 8), dark);
    beam.rotation.x = Math.PI / 2;
    beam.position.set(dx, dy, -2.4);
    truss.add(beam);
  }
  for (let i = 0; i < 5; i += 1) {
    const rung = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.08, 6, 4), dark);
    rung.rotation.z = Math.PI / 4;
    rung.position.z = -6.2 + i * 1.9;
    truss.add(rung);
  }
  ship.add(truss);

  // ---- 회전 거주 구역 (원심 중력) ----
  // 고리와 살(스포크)을 한 그룹에 담아 통째로 돌린다. 회전은 cruiseScene이 매 프레임 돌려 준다.
  const ring = new THREE.Group();
  const RING_R = 6.2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 1.05, 16, 64), hull);
  ring.add(rim);
  // 고리 바깥면의 창 띠 (안에 사람이 산다는 느낌)
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.34, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xa8dcff }),
    );
    win.position.set(Math.cos(a) * (RING_R + 1.02), Math.sin(a) * (RING_R + 1.02), 0);
    win.rotation.z = a;
    ring.add(win);
  }
  // 살 네 개
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, RING_R, 10), foil);
    spoke.position.set(Math.cos(a) * RING_R / 2, Math.sin(a) * RING_R / 2, 0);
    spoke.rotation.z = a - Math.PI / 2;
    ring.add(spoke);
  }
  ring.position.z = -0.6;
  ship.add(ring);
  // 고리를 붙드는 축
  const hubBearing = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.6, 20), dark);
  hubBearing.rotation.x = Math.PI / 2;
  hubBearing.position.z = -0.6;
  ship.add(hubBearing);

  // ---- 태양전지판: 양옆 세 장씩 ----
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 4.4, 8), dark);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(side * 4.4, 0, -5.6);
    ship.add(arm);
    for (let i = 0; i < 3; i += 1) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 5.2), panelMat);
      panel.position.set(side * (10.6 + i * 8.4), 0, -5.6);
      panel.rotation.x = Math.PI / 2;
      ship.add(panel);
      const spar = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.14, 0.14), dark);
      spar.position.set(side * (10.6 + i * 8.4), 0, -5.6);
      ship.add(spar);
    }
  }

  // ---- 고이득 접시 안테나 ----
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf2f4fa, roughness: 0.3, metalness: 0.6, side: THREE.DoubleSide }),
  );
  dish.position.set(0, 4.4, -1.5);
  dish.rotation.x = -Math.PI * 0.35;
  ship.add(dish);
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), dark);
  feed.position.set(0, 5.5, -0.4);
  feed.rotation.x = -Math.PI * 0.35;
  ship.add(feed);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.4, 8), dark);
  mast.position.set(0, 3.2, -1.5);
  ship.add(mast);

  // ---- 방열판 두 장 (아래쪽으로) ----
  for (const side of [-1, 1]) {
    const rad = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 3.2), radiatorMat);
    rad.position.set(side * 3.4, -2.4, -4.5);
    rad.rotation.z = side * 0.5;
    rad.rotation.x = Math.PI / 2;
    ship.add(rad);
  }

  // ---- 자세 제어 추력기 ----
  for (const side of [-1, 1]) {
    for (const up of [-1, 1]) {
      const rcs = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 8), dark);
      rcs.position.set(side * 2.5, up * 1.6, 7.2);
      rcs.rotation.z = Math.PI / 2 * side;
      ship.add(rcs);
    }
  }

  // ---- 항법등 (빨강/초록, 실제 항공기처럼 좌현 빨강·우현 초록) ----
  const lights = [];
  for (const [side, color] of [[-1, 0xff5a5a], [1, 0x5aff9a]]) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 8),
      new THREE.MeshBasicMaterial({ color }),
    );
    light.position.set(side * 2.7, 1.9, 5.4);
    ship.add(light);
    lights.push(light);
  }

  ship.userData.flames = flames;
  ship.userData.lights = lights;
  ship.userData.ring = ring;      // 회전 거주 구역 (cruiseScene이 매 프레임 돌린다)
  return ship;
}
