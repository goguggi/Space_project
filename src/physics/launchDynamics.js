// 발사 운동 시뮬레이션 (11단계, 12단계에서 분리 물체 추가)
// 공식과 근거: docs/03_physics.md 6.2절(운동 방정식), 6.3절(단 분리), 6.6절(시간 적분)
// 화면(DOM)을 다루지 않는다. 입력은 로켓 제원(stages[] 형식)이고, step(dt)로 상태를 전진시킨다.
//
// 좌표계: 지구 중심 원점, 발사 평면 2차원. 발사장은 (0, R)에 있고 +x 가 진행 방향(다운레인지).
//   지구 자전은 반영하지 않는다 (단순화, P-04). 공기 저항은 계산하지 않는다 (D-21).
// 단위: m, m/s, kg, N, s

import { EARTH_GM, EARTH_RADIUS, STANDARD_GRAVITY } from '../data/constants.js';

// 대기압에 따른 추력 변화: T(h) = T_진공 − (T_진공 − T_해수면) · exp(−h / H). H는 대기 척도 높이 약 8,400 m
const ATMOSPHERE_SCALE_HEIGHT = 8_400;

/**
 * 기본 피치 프로그램 (D-40): 발사 10초까지 수직, 이후 서서히 수평 쪽으로.
 * 반환값은 국소 수직에서 진행 방향으로 기울인 각도(라디안). 0 = 수직, π/2 = 수평
 * 지속시간 200초, 최종 85°는 팔콘 헤비 제원으로 실험해 정한 값이다 (P-05).
 * 120초로 눕히면 2단 연소가 끝나기 전에 추락하고, 200초·85°이면 연소 종료 시 고도 약 490 km, 속도 약 11 km/s가 된다.
 * @param {number} t  발사 후 경과 시간 (s)
 */
export function defaultPitchProgram(t) {
  const VERTICAL_UNTIL = 10;
  const TURN_DURATION = 200;
  const FINAL_PITCH = (85 * Math.PI) / 180;
  if (t < VERTICAL_UNTIL) return 0;
  const k = Math.min((t - VERTICAL_UNTIL) / TURN_DURATION, 1);
  // 부드럽게 (처음엔 천천히, 끝에서 천천히)
  const smooth = k * k * (3 - 2 * k);
  return FINAL_PITCH * smooth;
}

/**
 * 고도에 따른 엔진 1개의 추력
 */
function thrustAtAltitude(engine, altitude) {
  const h = Math.max(altitude, 0);
  const f = Math.exp(-h / ATMOSPHERE_SCALE_HEIGHT);
  return engine.thrustVacuumN - (engine.thrustVacuumN - engine.thrustSeaLevelN) * f;
}

/**
 * 발사 시뮬레이션을 만든다.
 * @param {object} spec  로켓 제원 (data/falconHeavy.js 형식: payloadMassKg, stages[])
 * @param {object} [options]
 * @param {(t: number) => number} [options.pitchProgram]  피치 각도 함수
 * @param {boolean} [options.gravity=true]  false면 중력을 끈다 (치올콥스키 검증용)
 * @param {number} [options.stepSeconds=1/60]  적분 시간 간격
 */
export function createLaunchSimulation(spec, options = {}) {
  const pitchProgram = options.pitchProgram ?? defaultPitchProgram;
  const gravityOn = options.gravity ?? true;
  const stepSeconds = options.stepSeconds ?? 1 / 60;

  // 단 상태 복사 (원본 제원은 바꾸지 않는다)
  const stages = spec.stages.map((s) => ({
    id: s.id,
    label: s.label,
    role: s.role,
    order: s.separationOrder,
    dryMass: s.dryMassKg,
    propellant: s.propellantMassKg,
    initialPropellant: s.propellantMassKg,
    engines: s.engines,
    throttleWhileBoosters: s.throttleWhileBoosters ?? 1,
    recovery: s.recovery ?? { enabled: false },
    // 분리 시점: 회수 단은 착륙용 예비 추진제(reserve)가 남았을 때 분리된다
    reserve: s.recovery?.enabled ? (s.recovery.reservePropellantFraction ?? 0) * s.propellantMassKg : 0,
    attached: true,
    burning: false,
    separatedAt: null,
  }));

  const vehicle = {
    r: { x: 0, y: EARTH_RADIUS },   // 위치 (m)
    v: { x: 0, y: 0 },              // 속도 (m/s)
    mass: 0,                        // 현재 총질량 (kg)
    thrust: 0,                      // 현재 총 추력 (N)
    pitch: 0,                       // 현재 피치 (rad)
    dir: { x: 0, y: 1 },            // 추력 방향 단위벡터
  };

  let time = 0;
  let complete = false;
  let liftedOff = false;
  const pendingEvents = [];

  function attachedMass() {
    let m = spec.payloadMassKg;
    for (const s of stages) if (s.attached) m += s.dryMass + s.propellant;
    return m;
  }

  // 지금 연소 중이어야 할 단을 정한다 (docs/03_physics.md 6.3절의 순서)
  // - 붙어 있는 병렬 단 중 가장 낮은 순서
  // - 붙어 있는 직렬 단 중 가장 낮은 순서
  function updateBurningSet() {
    const attached = stages.filter((s) => s.attached);
    const minOrder = Math.min(...attached.map((s) => s.order));
    const serial = attached.filter((s) => s.role === 'serial');
    const minSerialOrder = serial.length ? Math.min(...serial.map((s) => s.order)) : Infinity;
    for (const s of stages) {
      const shouldBurn = s.attached && s.propellant > s.reserve
        && ((s.role === 'parallel' && s.order === minOrder) || (s.role === 'serial' && s.order === minSerialOrder));
      if (shouldBurn && !s.burning) pendingEvents.push({ type: 'ignition', stageId: s.id, label: s.label, time });
      s.burning = shouldBurn;
    }
  }

  function altitude() {
    return Math.hypot(vehicle.r.x, vehicle.r.y) - EARTH_RADIUS;
  }

  function boostersAttached() {
    return stages.some((s) => s.attached && s.role === 'parallel');
  }

  updateBurningSet();
  vehicle.mass = attachedMass();

  /**
   * 시뮬레이션을 dt초 전진시킨다. 내부에서는 stepSeconds 간격으로 여러 번 적분한다.
   * @param {number} dt
   * @returns {object[]} 이 동안 일어난 사건들 (ignition / separation / complete)
   */
  function step(dt) {
    if (complete) return [];
    let remaining = dt;
    while (remaining > 0 && !complete) {
      const h = Math.min(stepSeconds, remaining);
      integrate(h);
      remaining -= h;
    }
    const events = pendingEvents.splice(0);
    return events;
  }

  function integrate(h) {
    const alt = altitude();
    const rNorm = Math.hypot(vehicle.r.x, vehicle.r.y);
    const up = { x: vehicle.r.x / rNorm, y: vehicle.r.y / rNorm };          // 국소 수직
    const east = { x: up.y, y: -up.x };                                        // 진행 방향(국소 수평)

    // 추력 방향: 국소 수직에서 pitch만큼 진행 방향으로 기울임
    const pitch = pitchProgram(time);
    vehicle.pitch = pitch;
    vehicle.dir = {
      x: up.x * Math.cos(pitch) + east.x * Math.sin(pitch),
      y: up.y * Math.cos(pitch) + east.y * Math.sin(pitch),
    };

    // 추력과 질량 유량
    const boosters = boostersAttached();
    let thrust = 0;
    let massFlow = 0;
    for (const s of stages) {
      if (!s.burning) continue;
      const throttle = (s.role === 'serial' && boosters) ? s.throttleWhileBoosters : 1;
      const perEngine = thrustAtAltitude(s.engines, alt);
      thrust += s.engines.count * perEngine * throttle;
      // 질량 유량은 진공 값으로 정의된다: ṁ = T_진공 / (Isp_진공 · g₀)
      const flow = s.engines.count * (s.engines.thrustVacuumN / (s.engines.ispVacuumS * STANDARD_GRAVITY)) * throttle;
      const burned = Math.min(flow * h, s.propellant - s.reserve);
      s.propellant -= burned;
      massFlow += burned / h;
    }
    vehicle.thrust = thrust;
    const mass = attachedMass();
    vehicle.mass = mass;

    // 가속도 = 추력/질량 · 방향 − GM/|r|² · r̂
    let ax = (thrust / mass) * vehicle.dir.x;
    let ay = (thrust / mass) * vehicle.dir.y;
    if (gravityOn) {
      const g = EARTH_GM / (rNorm * rNorm);
      ax -= g * up.x;
      ay -= g * up.y;
    }

    // 반음해 오일러: 속도를 먼저 갱신하고 그 속도로 위치 갱신
    vehicle.v.x += ax * h;
    vehicle.v.y += ay * h;
    vehicle.r.x += vehicle.v.x * h;
    vehicle.r.y += vehicle.v.y * h;

    // 지면 처리: 발사 직후(추력 < 무게)에는 발사대에 붙어 있고, 비행 중에 지면 아래로 내려가면 추락으로 끝낸다
    if (gravityOn && altitude() < 0) {
      const newNorm = Math.hypot(vehicle.r.x, vehicle.r.y);
      vehicle.r.x *= EARTH_RADIUS / newNorm;
      vehicle.r.y *= EARTH_RADIUS / newNorm;
      const wasFlying = liftedOff;
      vehicle.v.x = 0;
      vehicle.v.y = 0;
      if (wasFlying) {
        complete = true;
        pendingEvents.push({ type: 'crash', time, state: { r: { ...vehicle.r }, v: { x: 0, y: 0 } } });
        return;
      }
    } else if (altitude() > 1) {
      liftedOff = true;
    }

    time += h;

    // 단 분리: 연소 중이던 단이 예비 추진제까지 다 썼으면 분리
    let separated = false;
    for (const s of stages) {
      if (s.attached && s.burning && s.propellant <= s.reserve + 1e-6) {
        s.attached = false;
        s.burning = false;
        s.separatedAt = time;
        separated = true;
        pendingEvents.push({
          type: 'separation', stageId: s.id, label: s.label, time,
          state: { r: { ...vehicle.r }, v: { ...vehicle.v }, dir: { ...vehicle.dir } },
          stage: s,
        });
      }
    }
    if (separated) {
      updateBurningSet();
      if (!stages.some((s) => s.attached)) {
        complete = true;
        pendingEvents.push({ type: 'complete', time, state: { r: { ...vehicle.r }, v: { ...vehicle.v } } });
      }
    }
  }

  return {
    stages,
    vehicle,
    step,
    getTime: () => time,
    getAltitude: altitude,
    getSpeed: () => Math.hypot(vehicle.v.x, vehicle.v.y),
    // 발사장에서 잰 다운레인지 각도 (rad). 화면 배치에 쓴다
    getDownrangeAngle: () => Math.atan2(vehicle.r.x, vehicle.r.y),
    isComplete: () => complete,
    getMass: () => vehicle.mass,
  };
}
