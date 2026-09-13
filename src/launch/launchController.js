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
import { createPipView } from './pipView.js';
import { selectLandingTarget, landingPhaseLabel } from './landingTarget.js';
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

  // 남은 발사 과정을 즉시 계산해 끝낸다 (HUD 버튼과 임무 조작 막대가 함께 쓴다)
  function skip() {
    const events = timeline.skip();
    handleEvents(events);
    placeRocket();
    refreshViews();
    if (timeline.sim.isComplete()) handlers.onComplete?.(events);
  }

  const hud = createLaunchHud(hudContainer, {
    onTimeScale: (n) => timeline.setTimeScale(n),
    onSkip: skip,
  });

  // 착륙 장면 보조 화면 (14단계). HUD와 같은 요소에 얹어 3D 캔버스 위에 겹친다
  const pip = createPipView(scene, hudContainer);

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
      // 무인선: 유도가 착륙 지점을 확정하는 순간(부스트백 종료) 그 위치에 놓는다
      if (body.recovery?.target === 'drone_ship' && body.targetDownrange != null && !droneShip) {
        droneShip = createDroneShip(body.targetDownrange, LANDING_SITES.drone_ship.label);
        scene.scene.add(droneShip);
      }
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

  // 보조 화면과 HUD를 지금 상태에 맞춘다. 비출 대상은 D-42대로 자동으로 고른다
  function refreshViews() {
    const body = selectLandingTarget(timeline.sim.bodies);
    const group = body ? detachedGroups.get(body.id) : null;
    if (group) {
      pip.setTarget(group, body.label);
      pip.setPhase(landingPhaseLabel(body));
    } else {
      pip.clear();
    }
    hud.update(timeline, group ? body : null);
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === 'separation' && e.body) {
        const group = rocket.detachStage(e.stageId, scene.scene);
        if (group) detachedGroups.set(e.body.id, group);
      }
    }
  }

  // ---- 시점 모드 (17단계, D-58) ----
  // first 로켓 꼭대기에서 진행 방향을 본다 · third 뒤에서 따라간다 · wide 멀리서 지구 곡률까지
  let viewMode = 'third';
  const firstPersonLook = new THREE.Vector3();
  const baseOffset = new THREE.Vector3(18, 0, 24);   // 로켓 기준 카메라 오프셋 (시점 모드마다 바뀐다)

  function setCameraMode(id) {
    viewMode = id === 'first' || id === 'wide' ? id : 'third';
    scene.controls.enabled = viewMode !== 'first';
    if (viewMode === 'third') {
      scene.camera.fov = 50;
      orbit.distance = ORBIT_DEFAULT.third.distance;
      orbit.pitch = ORBIT_DEFAULT.third.pitch;
      follow.setTarget(rocket.root, baseOffset.clone());
    } else if (viewMode === 'wide') {
      scene.camera.fov = 55;
      orbit.distance = ORBIT_DEFAULT.wide.distance;
      orbit.pitch = ORBIT_DEFAULT.wide.pitch;
      follow.setTarget(rocket.root, baseOffset.clone());
    } else {
      scene.camera.fov = 78;
      follow.setTarget(null);
    }
    if (viewMode !== 'first') updateUprightCamera();
    scene.camera.updateProjectionMatrix();
  }

  // ---- 우클릭 시점 회전 (19단계, D-74) ----
  // 매 프레임 카메라 자리를 다시 잡기 때문에 OrbitControls로는 시점을 돌릴 수 없다.
  // 그래서 사용자의 회전각(yaw·pitch)과 거리를 따로 들고 있다가, 로켓 기준 자리를 그 값으로 계산한다.
  // 오른쪽 버튼 드래그로 돌리고, 휠로 멀어졌다 가까워진다. 왼쪽 드래그도 같게 동작한다.
  const orbit = { yaw: 0.62, pitch: 0.22, distance: 34 };
  const ORBIT_DEFAULT = { third: { distance: 34, pitch: 0.22 }, wide: { distance: 210, pitch: 0.32 } };
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };
  const canvas = scene.renderer.domElement;

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    if (viewMode === 'first') return;
    if (e.button !== 0 && e.button !== 2) return;
    dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    orbit.yaw -= (e.clientX - lastPointer.x) * 0.006;
    orbit.pitch = Math.max(-1.2, Math.min(1.35, orbit.pitch + (e.clientY - lastPointer.y) * 0.005));
    lastPointer = { x: e.clientX, y: e.clientY };
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    if (viewMode === 'first') return;
    e.preventDefault();
    orbit.distance = Math.max(12, Math.min(4_000, orbit.distance * (1 + Math.sign(e.deltaY) * 0.12)));
  }, { passive: false });

  // 로켓이 있는 곳의 국소 수직 (지구 중심에서 로켓을 향하는 방향). 화면 좌표계 기준
  const localUp = new THREE.Vector3();
  const camOffset = new THREE.Vector3();

  /**
   * 3인칭·광역에서 카메라가 로켓과 함께 기울도록 만든다 (18단계 수정).
   * 발사 후 로켓은 피치 프로그램으로 동쪽으로 눕고, 지구 곡률을 따라 진행 방향도 돈다.
   * 카메라 오프셋을 세계 좌표에 고정해 두면 그만큼 화면이 옆으로 돌아가 보인다.
   * 그래서 오프셋을 로켓의 국소 수직에 맞춰 함께 돌리고, 카메라의 위쪽도 국소 수직으로 둔다.
   */
  const zAxis = new THREE.Vector3(0, 0, 1);

  function updateUprightCamera() {
    const { r } = timeline.sim.vehicle;
    // 화면 좌표에서 지구 중심은 (0, −R/S, 0). 로켓 위치에서 본 국소 수직
    const [x, y] = toScene(r);
    localUp.set(x, y + EARTH_RADIUS / S, 0).normalize();
    const angle = Math.atan2(localUp.x, localUp.y);   // 발사장에서 잰 다운레인지 각

    // 사용자가 돌린 각도(yaw·pitch)와 거리로 로켓 기준 자리를 만든다.
    // 로켓의 위쪽이 +Y가 되는 국소 좌표에서 계산한 뒤, 다운레인지 각만큼 함께 돌린다.
    const cp = Math.cos(orbit.pitch);
    camOffset.set(
      Math.sin(orbit.yaw) * cp * orbit.distance,
      Math.sin(orbit.pitch) * orbit.distance + rocket.heightUnits * 0.4,
      Math.cos(orbit.yaw) * cp * orbit.distance,
    );
    camOffset.applyAxisAngle(zAxis, angle);
    follow.setOffset(camOffset);
    scene.camera.up.copy(localUp);
  }

  /**
   * 조건을 만족할 때까지 시뮬레이션을 즉시 전진시킨다 (19단계: 상승 이정표 건너뛰기).
   * @param {(sim: object) => boolean} predicate
   */
  function advanceUntil(predicate, maxSeconds = 1_500) {
    if (predicate(timeline.sim)) return;
    let elapsed = 0;
    while (elapsed < maxSeconds && !predicate(timeline.sim) && !timeline.sim.isAllSettled()) {
      const events = timeline.advance(2);
      handleEvents(events);
      elapsed += 2;
      if (events.some((e) => e.type === 'complete')) { handlers.onComplete?.(events); break; }
    }
    placeRocket();
    refreshViews();
  }

  /** 1인칭: 로켓 꼭대기에 카메라를 두고 추력 방향을 본다 */
  function updateFirstPerson() {
    const { r, dir } = timeline.sim.vehicle;
    const [x, y, z] = toScene(r);
    scene.camera.position.set(x + dir.x * rocket.heightUnits * 0.62, y + dir.y * rocket.heightUnits * 0.62, z + 0.8);
    firstPersonLook.set(x + dir.x * 4000, y + dir.y * 4000, z);
    scene.camera.up.set(dir.x, dir.y, 0);
    scene.camera.lookAt(firstPersonLook);
  }

  scene.onFrame((dt) => {
    const events = timeline.update(dt);
    handleEvents(events);
    placeRocket();
    if (viewMode === 'first') { updateFirstPerson(); } else { updateUprightCamera(); follow.update(); }
    refreshViews();
    if (events.some((e) => e.type === 'complete')) handlers.onComplete?.(events);
  });

  // 주 화면을 그린 뒤 같은 렌더러의 일부 영역에 착륙 장면을 덧그린다 (14단계)
  scene.onAfterRender(() => pip.render());

  placeRocket();
  refreshViews();
  scene.start();

  return {
    launch() { timeline.start(); },
    skip,
    advanceUntil,
    setCameraMode,
    get cameraMode() { return viewMode; },
    /** 항행 화면으로 넘어갈 때 발사 계기판을 숨긴다 (15단계) */
    setHudVisible(on) { hudContainer.style.display = on ? '' : 'none'; },
    reset() {
      timeline.reset();
      // 분리된 단 그룹을 로켓에 다시 붙인다 (원래 국소 좌표로)
      for (const [, group] of detachedGroups) scene.scene.remove(group);
      detachedGroups.clear();
      if (droneShip) { scene.scene.remove(droneShip); droneShip = null; }
      rocket.reassemble();
      pip.clear();
      placeRocket();
      setCameraMode(viewMode);
      refreshViews();
    },
    get timeline() { return timeline; },
    scene,
  };
}
