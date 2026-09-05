// 착륙 장면용 보조 화면 (14단계, D-24 · D-42 · D-48)
// 역할: 같은 3D 장면을 두 번째 카메라로 한 번 더 그려서, 주 화면(2단) 옆에 착륙 중인 부스터/코어를 보여준다.
//       팔콘 헤비 중계 화면과 같은 배치로 왼쪽 아래 인셋에 두고, 위에 대상 이름을 적는다 (D-48).
//
// 방법: Three.js는 렌더러의 일부 영역에만 그릴 수 있다. setViewport로 그릴 사각형을,
//       setScissor + setScissorTest(true)로 지울 범위를 같은 사각형으로 제한한 뒤 다시 render 한다.
//       사각형은 CSS로 배치한 테두리 요소(.pip-view)의 실제 위치를 재서 정하므로 테두리와 그림이 정확히 겹친다.
//       WebGL의 y는 아래에서 위로 재므로 캔버스 아래쪽 기준으로 바꿔 준다.
//
// 카메라: 대상의 국소 수직(up)을 카메라의 위쪽으로 삼아 로켓이 화면에서 똑바로 서 보이게 하고,
//         발사 평면 바깥(+z)에서 옆으로 비스듬히 본다. 물리 계산은 하지 않는다.

import * as THREE from '../../lib/three/three.module.js';
import { EARTH_DISPLAY_RADIUS } from './launchScene.js';

// 카메라 배치 (화면 단위, 1 단위 = 10 m)
const CAMERA_DISTANCE = 13;   // 발사 평면 바깥쪽(+z)으로 떨어진 거리 → 약 130 m
const CAMERA_SIDE = 5;        // 진행 방향으로 살짝 옆
const CAMERA_UP = 3;          // 대상보다 살짝 위 (착륙 지점이 함께 보이도록)

// 지구 중심의 화면 좌표. launchScene이 지구를 여기에 놓는다
const EARTH_CENTER = new THREE.Vector3(0, -EARTH_DISPLAY_RADIUS, 0);

/**
 * @param {object} sceneApi          createLaunchScene()이 돌려준 값 (renderer, scene 사용)
 * @param {HTMLElement} overlayHost  테두리·이름표를 넣을 요소 (.launch-frame 안쪽)
 * @returns {{
 *   setTarget: (object3d: THREE.Object3D | null, label?: string) => void,
 *   setPhase: (text: string) => void,
 *   render: () => void,     매 프레임 주 화면을 그린 뒤에 부른다
 *   clear: () => void,      대상 해제 + 숨김
 *   get visible(): boolean,
 * }}
 */
export function createPipView(sceneApi, overlayHost) {
  const { scene, renderer } = sceneApi;

  const el = document.createElement('div');
  el.className = 'pip-view';
  el.hidden = true;
  el.innerHTML = `
    <div class="pip-caption">
      <span class="pip-name" id="pip-name">착륙 장면</span>
      <span class="pip-phase" id="pip-phase"></span>
    </div>
  `;
  overlayHost.appendChild(el);
  const nameEl = el.querySelector('#pip-name');
  const phaseEl = el.querySelector('#pip-phase');

  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.5, 1e7);

  let target = null;
  const targetPos = new THREE.Vector3();
  const up = new THREE.Vector3();
  const side = new THREE.Vector3();

  function setTarget(object3d, label) {
    target = object3d ?? null;
    el.hidden = !target;
    if (label != null) nameEl.textContent = label;
  }

  function setPhase(text) {
    phaseEl.textContent = text ?? '';
  }

  function clear() {
    target = null;
    el.hidden = true;
    phaseEl.textContent = '';
  }

  function updateCamera() {
    target.getWorldPosition(targetPos);
    // 국소 수직: 지구 중심에서 대상을 향하는 방향
    up.copy(targetPos).sub(EARTH_CENTER).normalize();
    // 발사 평면(z = 0) 안에서 수직에 직각인 방향 = 진행 방향
    side.set(up.y, -up.x, 0);

    camera.up.copy(up);
    camera.position.copy(targetPos)
      .addScaledVector(up, CAMERA_UP)
      .addScaledVector(side, CAMERA_SIDE);
    camera.position.z += CAMERA_DISTANCE;
    camera.lookAt(targetPos);
  }

  function render() {
    if (!target || el.hidden) return;
    const canvasRect = renderer.domElement.getBoundingClientRect();
    const pipRect = el.getBoundingClientRect();
    const w = Math.round(pipRect.width);
    const h = Math.round(pipRect.height);
    if (w < 4 || h < 4 || canvasRect.width < 4) return;

    const x = Math.round(pipRect.left - canvasRect.left);
    const y = Math.round(canvasRect.bottom - pipRect.bottom);   // WebGL은 아래가 0

    updateCamera();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // 잘라내기(scissor)를 켜면 지우기와 그리기가 이 사각형 안에서만 일어난다
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, canvasRect.width, canvasRect.height);
  }

  return {
    setTarget,
    setPhase,
    render,
    clear,
    get visible() { return !el.hidden; },
  };
}
