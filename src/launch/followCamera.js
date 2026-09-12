// 3인칭 따라가기 카메라 (11단계, D-24)
// 방식: 매 프레임 대상이 움직인 만큼 카메라도 같이 움직이고, OrbitControls의 회전 중심을 대상에 둔다.
//       그래서 사용자가 마우스로 돌린 시점 각도는 유지되면서 카메라가 로켓을 따라간다 (KSP 방식).

import * as THREE from '../../lib/three/three.module.js';

/**
 * @param {THREE.Camera} camera
 * @param {import('../../lib/three/OrbitControls.js').OrbitControls} controls
 * @returns {{ setTarget: (object, offset?) => void, setOffset: (offset) => void, update: () => void }}
 */
export function createFollowCamera(camera, controls) {
  let target = null;
  const lastTargetPos = new THREE.Vector3();
  const currentPos = new THREE.Vector3();
  const offsetNow = new THREE.Vector3(30, 12, 30);

  function setTarget(object, offset = new THREE.Vector3(30, 12, 30)) {
    target = object;
    offsetNow.copy(offset);
    if (!target) return;
    target.getWorldPosition(lastTargetPos);
    camera.position.copy(lastTargetPos).add(offsetNow);
    controls.target.copy(lastTargetPos);
    controls.update();
  }

  /**
   * 오프셋만 바꾼다 (18단계). 로켓이 기울 때 카메라도 같이 기울여 화면이 옆으로 돌지 않게 한다.
   * 사용자가 마우스로 돌린 각도는 유지하지 않고, 로켓 기준 자리로 다시 잡는다.
   */
  function setOffset(offset) {
    offsetNow.copy(offset);
    if (!target) return;
    target.getWorldPosition(currentPos);
    camera.position.copy(currentPos).add(offsetNow);
    controls.target.copy(currentPos);
    lastTargetPos.copy(currentPos);
  }

  function update() {
    if (!target) return;
    target.getWorldPosition(currentPos);
    const delta = currentPos.clone().sub(lastTargetPos);
    camera.position.add(delta);
    controls.target.copy(currentPos);
    lastTargetPos.copy(currentPos);
  }

  return { setTarget, setOffset, update };
}
