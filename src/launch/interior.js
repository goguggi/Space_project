// 탐사선 선내 (20단계, D-79) — 17·18단계의 조종석을 대신한다
// 역할: 1인칭에서 우주선 안을 재현한다. 앞을 보면 창밖(별·천체), 뒤나 옆을 보면 선내가 보인다.
// 계산은 하지 않는다. main.js가 준 숫자를 계기판에 그린다.
//
// 방식: 카메라의 자식이 아니라 **장면에 고정된 방**으로 만든다. 그래야 고개를 돌릴 때
//   선내가 함께 돌지 않고 진짜 방 안에 앉아 있는 것처럼 보인다.
//   카메라는 방 안 좌석 위치에 있고, 창은 뚫려 있어 바깥 별과 천체가 그대로 보인다.
// 좌표: +Z가 진행 방향(앞 창), 카메라는 원점 부근.

import * as THREE from '../../lib/three/three.module.js';

const CABIN_RADIUS = 2.9;
const CABIN_LENGTH = 10;

/** 계기판·표지판 글씨를 그릴 캔버스 텍스처 */
function makeCanvasTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

/** 선내 벽 텍스처: 옅은 회색 패널에 이음선과 리벳 */
function makeWallTexture() {
  const { canvas, ctx, texture } = makeCanvasTexture(512, 256);
  ctx.fillStyle = '#2b3350';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = 'rgba(150, 175, 230, 0.22)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  for (let y = 0; y <= 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(180, 200, 240, 0.28)';
  for (let x = 16; x < 512; x += 64) {
    for (let y = 16; y < 256; y += 64) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1.4);
  return texture;
}

function makeSeat(material, frameMaterial) {
  const seat = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 1.1), material);
  seat.add(base);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.2), material);
  back.position.set(0, 0.8, -0.5);
  back.rotation.x = -0.16;
  seat.add(back);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.24), material);
  head.position.set(0, 1.7, -0.62);
  seat.add(head);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.9), frameMaterial);
    arm.position.set(side * 0.62, 0.42, -0.05);
    seat.add(arm);
  }
  // 다리
  for (const [sx, sz] of [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), frameMaterial);
    leg.position.set(sx, -0.46, sz);
    seat.add(leg);
  }
  return seat;
}

/**
 * 선내를 만든다. 장면에 넣고, 1인칭일 때만 보이게 한다.
 * @param {THREE.Scene} scene
 * @returns {object}
 */
export function createInterior(scene) {
  const root = new THREE.Group();
  root.name = 'interior';
  root.visible = false;
  scene.add(root);

  const wallMat = new THREE.MeshStandardMaterial({
    map: makeWallTexture(), roughness: 0.85, metalness: 0.1, side: THREE.BackSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x2f3856, roughness: 0.7, metalness: 0.25 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x39415e, roughness: 0.95 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x6fa8ff });

  // ---- 치수 ----
  // 카메라는 (0, 0.2, 1.2)에 앉는다. 앞 격벽은 z = 3.0 이므로 눈에서 1.8 떨어져 있다.
  // 화각 76°에서 그 거리의 화면 반높이는 1.8·tan38° ≈ 1.41 이다. 창을 그보다 작게 뚫고,
  // 나머지는 큰 판으로 완전히 가려 "창 밖만 보이는" 상태를 만든다.
  const FRONT_Z = 3.0;
  const WIN_HALF_W = 1.32;
  const WIN_HALF_H = 0.76;

  // 선실 원통 (안쪽 면만 보이게)
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(CABIN_RADIUS, CABIN_RADIUS, CABIN_LENGTH, 32, 1, true),
    wallMat,
  );
  shell.rotation.x = Math.PI / 2;
  shell.position.z = -1.6;
  root.add(shell);

  // ---- 앞 격벽: 창 구멍 둘레를 큰 판 네 장으로 완전히 막는다 ----
  const bulkhead = [
    { w: 12, h: 5, x: 0, y: WIN_HALF_H + 2.5 },
    { w: 12, h: 5, x: 0, y: -WIN_HALF_H - 2.5 },
    { w: 5, h: WIN_HALF_H * 2, x: -WIN_HALF_W - 2.5, y: 0 },
    { w: 5, h: WIN_HALF_H * 2, x: WIN_HALF_W + 2.5, y: 0 },
  ];
  for (const p of bulkhead) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), trimMat);
    m.position.set(p.x, p.y, FRONT_Z);
    m.rotation.y = Math.PI;
    root.add(m);
  }

  // 창틀 (구멍 둘레의 금속 테두리)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8d94a6, roughness: 0.4, metalness: 0.7 });
  for (const [w, h, x, y] of [
    [WIN_HALF_W * 2 + 0.2, 0.1, 0, WIN_HALF_H + 0.05],
    [WIN_HALF_W * 2 + 0.2, 0.1, 0, -WIN_HALF_H - 0.05],
    [0.1, WIN_HALF_H * 2, -WIN_HALF_W - 0.05, 0],
    [0.1, WIN_HALF_H * 2, WIN_HALF_W + 0.05, 0],
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
    bar.position.set(x, y, FRONT_Z - 0.06);
    root.add(bar);
  }
  // 창 가운데 세로 지지대 (실제 우주선 창처럼)
  const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, WIN_HALF_H * 2, 0.1), frameMat);
  mullion.position.set(0, 0, FRONT_Z - 0.06);
  root.add(mullion);

  // ---- 정면 계기판 (창 바로 아래, 살짝 눕혀서) ----
  const main = makeCanvasTexture(640, 80);
  const mainPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.3),
    new THREE.MeshBasicMaterial({ map: main.texture }),
  );
  // 눈높이(0.2)에서 z = 2.88 까지는 1.68. 화각 76°의 화면 반높이가 1.31이므로
  // 계기판 중심을 y = −0.98 에 두어야 창 바로 아래에 딱 보인다
  mainPanel.position.set(0, -0.98, FRONT_Z - 0.12);
  mainPanel.rotation.set(0.42, Math.PI, 0);
  root.add(mainPanel);

  // 계기판 아래 버튼 줄
  for (let i = 0; i < 11; i += 1) {
    const light = new THREE.Mesh(
      new THREE.CircleGeometry(0.026, 12),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x4fd1a0 : i % 3 === 1 ? 0x6fa8ff : 0xff8f6a }),
    );
    light.position.set(-0.9 + i * 0.18, -1.11, FRONT_Z - 0.2);
    light.rotation.set(0.42, Math.PI, 0);
    root.add(light);
  }

  // ---- 뒤쪽 격벽과 해치 (고개를 돌리면 보인다) ----
  const backZ = -6.6;
  const backWall = new THREE.Mesh(new THREE.CircleGeometry(CABIN_RADIUS, 32), trimMat);
  backWall.position.set(0, 0, backZ);
  root.add(backWall);
  const hatch = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 24),
    new THREE.MeshStandardMaterial({ color: 0x4a5372, roughness: 0.6, metalness: 0.4 }),
  );
  hatch.position.set(0, -0.3, backZ + 0.03);
  root.add(hatch);
  const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 8, 28), glowMat);
  hatchRing.position.set(0, -0.3, backZ + 0.06);
  root.add(hatchRing);
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), glowMat);
    bolt.position.set(Math.cos(a) * 1.25, -0.3 + Math.sin(a) * 1.25, backZ + 0.07);
    bolt.rotation.x = Math.PI / 2;
    root.add(bolt);
  }
  const hatchSign = makeCanvasTexture(256, 64);
  hatchSign.ctx.fillStyle = '#0b1224';
  hatchSign.ctx.fillRect(0, 0, 256, 64);
  hatchSign.ctx.font = 'bold 34px "Malgun Gothic", sans-serif';
  hatchSign.ctx.fillStyle = '#ff8f6a';
  hatchSign.ctx.fillText('에어록', 66, 44);
  hatchSign.texture.needsUpdate = true;
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.33),
    new THREE.MeshBasicMaterial({ map: hatchSign.texture }),
  );
  sign.position.set(0, 1.15, backZ + 0.04);
  root.add(sign);

  // ---- 바닥 ----
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, CABIN_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0x1d2338, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -1.9, -1.6);
  root.add(floor);

  // ---- 좌석 두 개 (카메라 바로 뒤·옆. 돌아보면 보인다) ----
  for (const side of [-1, 1]) {
    const seat = makeSeat(padMat, trimMat);
    seat.position.set(side * 1.35, -1.3, 0.9);
    seat.rotation.y = Math.PI;
    root.add(seat);
  }

  // ---- 측면 콘솔 ----
  const consoles = [];
  for (const side of [-1, 1]) {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 3.0), trimMat);
    desk.position.set(side * 2.35, -0.55, -1.0);
    root.add(desk);

    const display = makeCanvasTexture(256, 128);
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 0.62),
      new THREE.MeshBasicMaterial({ map: display.texture }),
    );
    screen.position.set(side * 2.5, 0.1, -1.0);
    screen.rotation.y = -side * Math.PI / 2;
    root.add(screen);
    consoles.push(display);

    for (let i = 0; i < 6; i += 1) {
      const sw = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.06, 0.1),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x4fd1a0 : 0xff8f6a }),
      );
      sw.position.set(side * 2.28, -0.44, -2.1 + i * 0.42);
      root.add(sw);
    }

    // 측면 관측창 (동그란 창 — 바깥이 비쳐 보이도록 뚫는 대신 밝은 원판으로)
    const port = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 24),
      new THREE.MeshBasicMaterial({ color: 0x0d1a33 }),
    );
    port.position.set(side * (CABIN_RADIUS - 0.02), 0.85, 0.6);
    port.rotation.y = -side * Math.PI / 2;
    root.add(port);
    const portRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 22), frameMat);
    portRing.position.copy(port.position);
    portRing.rotation.y = -side * Math.PI / 2;
    root.add(portRing);
  }

  // ---- 천장 조명과 관측창 테두리 ----
  const cabinLight = new THREE.PointLight(0xbfd4ff, 16, 26, 2);
  cabinLight.position.set(0, 1.9, -1);
  root.add(cabinLight);
  const frontLight = new THREE.PointLight(0x9fc4ff, 9, 12, 2);
  frontLight.position.set(0, 1.4, 2.2);
  root.add(frontLight);
  root.add(new THREE.AmbientLight(0x4a5580, 1.1));
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 6.5), glowMat);
  strip.position.set(0, CABIN_RADIUS - 0.3, -1.6);
  root.add(strip);
  const domeFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.09, 10, 28),
    frameMat,
  );
  domeFrame.position.set(0, CABIN_RADIUS - 0.05, -0.4);
  domeFrame.rotation.x = Math.PI / 2;
  root.add(domeFrame);

  // ---- 조준선 (카메라에 붙여 시선을 따라간다) ----
  const reticle = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.052, 0.06, 32),
    new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthTest: false }),
  );
  reticle.add(ring);
  for (const [dx, dy] of [[0.085, 0], [-0.085, 0], [0, 0.085], [0, -0.085]]) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(dx ? 0.03 : 0.006, dy ? 0.03 : 0.006),
      new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.75, depthTest: false }),
    );
    tick.position.set(dx, dy, 0);
    reticle.add(tick);
  }
  reticle.renderOrder = 999;
  reticle.position.z = -1.4;
  reticle.visible = false;

  let onTarget = false;

  /** 정면 계기판과 측면 화면을 새로 그린다 */
  function setReadout(info) {
    const { ctx, canvas, texture } = main;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(5, 10, 22, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(111, 168, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

    ctx.font = 'bold 30px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#e8ecf7';
    ctx.fillText(info.target ?? '-', 16, 54);
    ctx.font = '17px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#96a2c4';
    ctx.fillText('속도', 210, 30);
    ctx.fillText('남은 거리', 350, 30);
    ctx.fillText('γ', 560, 30);
    ctx.font = 'bold 23px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#6fa8ff';
    ctx.fillText(info.speedText ?? '-', 210, 60);
    ctx.fillText(info.remainText ?? '-', 350, 60);
    ctx.fillStyle = '#4fd1a0';
    ctx.fillText(info.gammaText ?? '-', 560, 60);
    texture.needsUpdate = true;

    // 측면 화면: 왼쪽은 항법, 오른쪽은 시스템
    const texts = [
      ['항법', ['목적지', info.target ?? '-', '조준', info.onTarget ? '유지' : '이탈']],
      ['시스템', ['전력', '정상', '생명유지', '정상', '통신', '연결']],
    ];
    consoles.forEach((c, i) => {
      const [title, lines] = texts[i];
      c.ctx.fillStyle = 'rgba(5, 10, 22, 0.95)';
      c.ctx.fillRect(0, 0, 256, 128);
      c.ctx.strokeStyle = 'rgba(79, 209, 160, 0.35)';
      c.ctx.lineWidth = 2;
      c.ctx.strokeRect(2, 2, 252, 124);
      c.ctx.font = 'bold 20px "Malgun Gothic", sans-serif';
      c.ctx.fillStyle = '#4fd1a0';
      c.ctx.fillText(title, 12, 26);
      c.ctx.font = '15px "Malgun Gothic", sans-serif';
      for (let k = 0; k < lines.length; k += 2) {
        c.ctx.fillStyle = '#96a2c4';
        c.ctx.fillText(lines[k], 12, 54 + (k / 2) * 24);
        c.ctx.fillStyle = '#e8ecf7';
        c.ctx.fillText(lines[k + 1], 110, 54 + (k / 2) * 24);
      }
      c.texture.needsUpdate = true;
    });

    if (info.onTarget !== onTarget) {
      onTarget = info.onTarget;
      const color = onTarget ? 0x4fd1a0 : 0x6fa8ff;
      reticle.traverse((o) => { if (o.material) o.material.color.setHex(color); });
    }
  }

  return {
    root,
    reticle,
    /** 카메라에 조준선을 붙인다 (선내는 장면에 고정, 조준선만 시선을 따라간다) */
    attachReticle(camera) { camera.add(reticle); },
    setVisible(on) { root.visible = on; reticle.visible = on; },
    setReadout,
    /** 카메라가 앉는 자리 (왼쪽 좌석의 눈높이) */
    get seatPosition() { return new THREE.Vector3(0, 0.2, 1.2); },
  };
}
