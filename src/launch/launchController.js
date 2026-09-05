// 발사 장면 조립 (11단계)
// 역할: 장면, 로켓 모델, 시뮬레이션, 카메라, HUD를 연결한다.
//       매 프레임 시뮬레이션을 전진시키고, 물리 좌표(m)를 화면 좌표(단위 = 10 m)로 옮겨 로켓을 놓는다.
//
// 좌표 변환: 물리는 지구 중심 원점, 발사장 (0, R). 화면은 발사장이 (0, 0, 0)이고 지구 중심이 (0, −R/S, 0).
//   화면 위치 = (x / S, (y − R) / S, 0). 지구를 실제 비율로 그리므로 각도와 곡률이 그대로 맞는다.

import * as THREE from '../../lib/three/three.module.js';
import { createLaunchScene, SCENE_METERS_PER_UNIT } from './launchScene.js';
import { createRocketModel } from './rocketModel.js';
import { createFollowCamera } from './followCamera.js';
import { createLaunchTimeline } from './launchTimeline.js';
import { createLaunchHud } from './launchHud.js';
import { EARTH_RADIUS } from '../data/constants.js';

const S = SCENE_METERS_PER_UNIT;

/**
 * @param {HTMLElement} sceneContainer  3D 캔버스 틀
 * @param {HTMLElement} hudContainer     HUD를 넣을 요소
 * @param {object} spec                  로켓 제원
 * @param {{ onComplete?: (events: object[]) => void }} [handlers]
 */
export function createLaunchController(sceneContainer, hudContainer, spec, handlers = {}) {
  const scene = createLaunchScene(sceneContainer);
  const rocket = createRocketModel(spec);
  scene.scene.add(rocket.root);

  const follow = createFollowCamera(scene.camera, scene.controls);
  follow.setTarget(rocket.root, new THREE.Vector3(18, rocket.heightUnits * 0.6, 24));

  let timeline = createLaunchTimeline(spec);

  const hud = createLaunchHud(hudContainer, {
    onTimeScale: (n) => timeline.setTimeScale(n),
    onSkip: () => {
      const events = timeline.skip();
      placeRocket();
      if (timeline.sim.isComplete()) handlers.onComplete?.(events);
    },
  });

  // 물리 상태 → 화면 배치
  function placeRocket() {
    const { r, dir } = timeline.sim.vehicle;
    rocket.root.position.set(r.x / S, (r.y - EARTH_RADIUS) / S, 0);
    // 로켓의 +Y 축을 추력 방향으로 맞춘다 (발사 평면 안에서 z축 회전)
    rocket.root.rotation.z = -Math.atan2(dir.x, dir.y);
    rocket.update(timeline.sim);
  }

  scene.onFrame((dt) => {
    const events = timeline.update(dt);
    placeRocket();
    follow.update();
    hud.update(timeline);
    if (events.some((e) => e.type === 'complete')) handlers.onComplete?.(events);
  });

  placeRocket();
  hud.update(timeline);
  scene.start();

  return {
    launch() { timeline.start(); },
    reset() {
      timeline.reset();
      placeRocket();
      follow.setTarget(rocket.root, new THREE.Vector3(18, rocket.heightUnits * 0.6, 24));
      hud.update(timeline);
    },
    get timeline() { return timeline; },
    scene,
  };
}
