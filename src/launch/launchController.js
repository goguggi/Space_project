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
import { createLandingPad, createDroneShip } from './landingSiteModel.js';
import { EARTH_RADIUS } from '../data/constants.js';
import { LANDING_SITES } from '../data/landingSites.js';

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
      handleEvents(events);
      placeRocket();
      hud.update(timeline);
      if (timeline.sim.isComplete()) handlers.onComplete?.(events);
    },
  });

  // 분리된 단의 3D 그룹: 물체 id → 그룹 (12단계)
  const detachedGroups = new Map();

  // 착륙장(고정)과 무인선(코어 분리 시 위치 확정) 3D 모델 (13단계)
  const landingPad = createLandingPad(LANDING_SITES.launch_site.downrangeM, LANDING_SITES.launch_site.label);
  scene.scene.add(landingPad);
  let droneShip = null;

  function toScene(r) {
    return [r.x / S, (r.y - EARTH_RADIUS) / S, 0];
  }

  // 물리 상태 → 화면 배치
  function placeRocket() {
    const { r, dir } = timeline.sim.vehicle;
    rocket.root.position.set(...toScene(r));
    // 로켓의 +Y 축을 추력 방향으로 맞춘다 (발사 평면 안에서 z축 회전)
    rocket.root.rotation.z = -Math.atan2(dir.x, dir.y);
    rocket.update(timeline.sim);
    placeBodies();
  }

  // 분리된 단들을 각자의 물리 위치에 놓는다.
  // 자세: 회수 단은 엔진을 아래로 향한 채(국소 수직) 내려오고, 버려진 단은 속도 방향을 따른다
  function placeBodies() {
    for (const body of timeline.sim.bodies) {
      const group = detachedGroups.get(body.id);
      if (!group) continue;
      group.position.set(...toScene(body.r));
      const flame = rocket.flames.get(body.stageId);
      if (body.recovery?.enabled) {
        group.rotation.z = -Math.atan2(body.r.x, body.r.y);   // 국소 수직 = 지구 중심 반대 방향
        if (flame) flame.visible = body.thrust > 0;
      } else {
        const speed = Math.hypot(body.v.x, body.v.y);
        if (speed > 1) group.rotation.z = -Math.atan2(body.v.x, body.v.y);
        if (flame) flame.visible = false;
      }
    }
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === 'separation' && e.body) {
        const group = rocket.detachStage(e.stageId, scene.scene);
        if (group) detachedGroups.set(e.body.id, group);
        // 무인선 착륙 대상이면 그 위치에 무인선을 놓는다
        if (e.body.recovery?.target === 'drone_ship' && e.body.targetDownrange != null && !droneShip) {
          droneShip = createDroneShip(e.body.targetDownrange, LANDING_SITES.drone_ship.label);
          scene.scene.add(droneShip);
        }
      }
    }
  }

  scene.onFrame((dt) => {
    const events = timeline.update(dt);
    handleEvents(events);
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
      // 분리된 단 그룹을 로켓에 다시 붙인다 (원래 국소 좌표로)
      for (const [, group] of detachedGroups) scene.scene.remove(group);
      detachedGroups.clear();
      if (droneShip) { scene.scene.remove(droneShip); droneShip = null; }
      rocket.reassemble();
      placeRocket();
      follow.setTarget(rocket.root, new THREE.Vector3(18, rocket.heightUnits * 0.6, 24));
      hud.update(timeline);
    },
    get timeline() { return timeline; },
    scene,
  };
}
