// 조종석 내부 (18단계, D-70)
// 역할: 1인칭 시점에서 카메라 앞에 창틀과 계기판을 붙여, 우주선 안에서 창밖을 내다보는 느낌을 만든다.
// 계산은 하지 않는다. main.js가 준 숫자를 계기판에 그린다.
//
// 방식: 카메라의 자식으로 붙여 항상 화면에 고정되게 한다. 창은 뚫린 사각형(테두리만 있는 판)이고,
//   그 너머로 원래의 별·천체 장면이 보인다. 계기판 글씨는 캔버스 텍스처로 만든다 (외부 자산 없음).

import * as THREE from '../../lib/three/three.module.js';

const PANEL_DISTANCE = 1.1;   // 카메라 앞 거리 (화면 단위)

/** 계기판 글씨를 그릴 캔버스 텍스처 */
function createDisplayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

/** 창틀: 가운데가 뚫린 사각 테두리를 네 조각의 판으로 만든다 */
function createFrame(material, { width, height, thickness }) {
  const g = new THREE.Group();
  const halfW = width / 2;
  const halfH = height / 2;
  const pieces = [
    { w: width + thickness * 2, h: thickness, x: 0, y: halfH + thickness / 2 },
    { w: width + thickness * 2, h: thickness, x: 0, y: -halfH - thickness / 2 },
    { w: thickness, h: height, x: -halfW - thickness / 2, y: 0 },
    { w: thickness, h: height, x: halfW + thickness / 2, y: 0 },
  ];
  for (const p of pieces) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), material);
    mesh.position.set(p.x, p.y, 0);
    g.add(mesh);
  }
  return g;
}

/**
 * 조종석을 만들어 카메라에 붙인다.
 * @param {THREE.Camera} camera
 * @returns {{ root: THREE.Group, setVisible: (on: boolean) => void, setReadout: (info: object) => void }}
 */
export function createCockpit(camera) {
  const root = new THREE.Group();
  root.name = 'cockpit';
  root.position.z = -PANEL_DISTANCE;   // 카메라 앞 (three.js 카메라는 −Z를 본다)
  root.visible = false;
  camera.add(root);

  const hullMaterial = new THREE.MeshBasicMaterial({ color: 0x161d33 });
  const trimMaterial = new THREE.MeshBasicMaterial({ color: 0x2a3557 });

  // ---- 앞 창 (가운데 큰 창) ----
  root.add(createFrame(trimMaterial, { width: 2.08, height: 1.0, thickness: 0.05 }));

  // ---- 창 바깥쪽을 막는 벽 (창 밖만 보이게) ----
  // 위·아래·좌·우로 크게 펼친 판. 가운데 창 부분만 비워 둔다
  const wall = [
    { w: 12.0, h: 6.0, x: 0, y: 3.55 },     // 위
    { w: 12.0, h: 6.0, x: 0, y: -3.55 },    // 아래 (계기판이 붙는다)
    { w: 6.0, h: 1.2, x: -4.09, y: 0 },     // 왼쪽
    { w: 6.0, h: 1.2, x: 4.09, y: 0 },      // 오른쪽
  ];
  for (const p of wall) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), hullMaterial);
    mesh.position.set(p.x, p.y, 0);
    root.add(mesh);
  }

  // ---- 옆 관측창 두 개 (실제로 뚫려 있지는 않고 테두리만) ----
  for (const side of [-1, 1]) {
    const port = createFrame(trimMaterial, { width: 0.34, height: 0.34, thickness: 0.03 });
    port.position.set(side * 1.42, 0.12, 0.002);
    root.add(port);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x0a1224 }),
    );
    glass.position.set(side * 1.42, 0.12, 0.001);
    root.add(glass);
  }

  // ---- 계기판 ----
  const display = createDisplayTexture();
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.92, 0.23),
    new THREE.MeshBasicMaterial({ map: display.texture, transparent: true }),
  );
  screen.position.set(0, -0.665, 0.004);
  root.add(screen);

  // 계기판 아래 조작 버튼 줄 (장식)
  for (let i = 0; i < 9; i += 1) {
    const light = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 12),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x4fd1a0 : i % 3 === 1 ? 0x6fa8ff : 0x7c6a4a }),
    );
    light.position.set(-0.36 + i * 0.09, -0.8, 0.004);
    root.add(light);
  }

  // ---- 조준선 (D-68: 목적지를 여기에 맞춰 두면 보너스) ----
  const reticle = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.055, 0.062, 32),
    new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  reticle.add(ring);
  for (const [dx, dy] of [[0.085, 0], [-0.085, 0], [0, 0.085], [0, -0.085]]) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.abs(dx) ? 0.03 : 0.006, Math.abs(dy) ? 0.03 : 0.006),
      new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.7 }),
    );
    tick.position.set(dx, dy, 0);
    reticle.add(tick);
  }
  reticle.position.set(0, 0.02, 0.003);
  root.add(reticle);

  let onTarget = false;

  /**
   * 계기판 내용을 새로 그린다.
   * @param {{ target: string, speedText: string, remainText: string, gammaText: string, onTarget: boolean }} info
   */
  function setReadout(info) {
    const { ctx, canvas, texture } = display;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(6, 12, 26, 0.92)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(111, 168, 255, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.font = 'bold 30px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#e8ecf7';
    ctx.fillText(info.target ?? '-', 20, 42);

    ctx.font = '22px "Malgun Gothic", sans-serif';
    ctx.fillStyle = '#96a2c4';
    ctx.fillText('속도', 20, 82);
    ctx.fillText('남은 거리', 190, 82);
    ctx.fillText('γ', 410, 82);
    ctx.fillStyle = '#6fa8ff';
    ctx.font = 'bold 24px "Malgun Gothic", sans-serif';
    ctx.fillText(info.speedText ?? '-', 20, 112);
    ctx.fillText(info.remainText ?? '-', 190, 112);
    ctx.fillStyle = '#4fd1a0';
    ctx.fillText(info.gammaText ?? '-', 410, 112);
    texture.needsUpdate = true;

    if (info.onTarget !== onTarget) {
      onTarget = info.onTarget;
      const color = onTarget ? 0x4fd1a0 : 0x6fa8ff;
      reticle.traverse((o) => { if (o.material) { o.material.color.setHex(color); o.material.opacity = onTarget ? 0.95 : 0.7; } });
    }
  }

  return {
    root,
    setVisible(on) { root.visible = on; },
    setReadout,
  };
}
