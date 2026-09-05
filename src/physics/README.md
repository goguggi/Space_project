# src/physics/ — 계산 로직

상대론적 시간 지연을 계산하는 순수 함수만 둔다.
공식과 근거는 [docs/03_physics.md](../../docs/03_physics.md)에 있다.

## 규칙

- 화면(DOM)을 절대 다루지 않는다. 숫자를 받아 숫자를 돌려준다.
- 입력과 출력 단위를 함수 주석에 반드시 적는다.
- 낮은 속도(β < 10⁻³)에서는 테일러 급수를 사용해 정밀도를 지킨다.
- 모든 함수는 `tests/`의 검증 페이지에서 기준값과 비교한다.

## 예정 파일

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `lorentz.js` | β = v/c, 로런츠 인자 γ, γ−1 (급수), 1−1/γ (급수) | 3단계 |
| `timeDilation.js` | 등속 모델: 거리, 속도, 편도/왕복 → 지구 시간, 우주선 시간, 차이 (초) | 4단계 |
| `acceleratedMotion.js` | 가속-감속 모델: 거리, 가속도 → 지구 시간, 우주선 시간, 최고 속도 | 8단계 (후순위) |
| `launchDynamics.js` | 발사 운동 방정식 적분 (추력, 중력, 질량 변화) | 11단계 |
| `landingGuidance.js` | (아래 현재 파일 목록으로 이동) | 13단계 |
| `rocketSpecValidator.js` | 로켓 제원 JSON 검증 규칙 V-01~V-07 | 16단계 |

## 현재 파일 목록

| 파일 | 내보내는 것 | 설명 |
|---|---|---|
| `lorentz.js` | `beta(v)`, `gamma(v)`, `gammaMinusOne(v)`, `oneMinusInverseGamma(v)` | 입력 m/s. β < 10⁻³이면 테일러 급수, 아니면 직접 계산 (docs/03_physics.md 3.1절). 검증값: 0.99c → γ 7.0888, 11.2 km/s → γ−1 6.98×10⁻¹⁰ |
| `timeDilation.js` | `computeTimeDilation({distance, speed, tripType})`, `TRIP_TYPES` | 등속 모델. 입력 m, m/s. 출력 `{earthTime, shipTime, difference, gamma, totalDistance}` (초, m). 왕복은 거리 2배. `difference`는 t_지구 × (1 − 1/γ)로 정밀 계산 |
| `launchDynamics.js` | `createLaunchSimulation(spec, {pitchProgram, gravity, stepSeconds})`, `defaultPitchProgram(t)` | 발사 운동 적분 (docs/03_physics.md 6절). 지구 중심 2차원 좌표, 반음해 오일러 1/60초. 단 목록(`stages[]` 형식)을 받아 점화·분리를 자동 처리하고 사건(`ignition`/`separation`/`complete`/`crash`)을 돌려준다. 추력은 고도에 따라 해수면↔진공 값을 지수 보간. 기본 피치: 10초 수직, 200초 동안 85°까지 (P-05). `gravity:false`는 치올콥스키 검증용 (11단계). 분리된 단은 `bodies[]`에 독립 물체로 추가되어 중력만 받으며 움직이고(`falling` → `landed`/`impact`), 회수하지 않는 단은 `discarded`. `isAllSettled()`는 우주선 완료 + 회수 대상 모두 접지 (12단계) |
| `landingGuidance.js` | `guideBody(body, h)`, `timeToGround`, `landingBurnAltitude`, `localFrame`, `predictedDownrange` | 재착륙 유도 (docs/03_physics.md 6.5절). 국소 평면 근사. 단계: coast → boostback(수평 속도를 목표 낙하 지점에 맞춤) → fall(수평 보정, 착륙 연소 고도 감시) → landing(호버슬램 v²/2h + g) → landed. **진행 중: 부스터 접지 속도가 아직 146 m/s** (docs/09_current_status.md 3절) |
| `staging.js` | (만들지 않음) | 계획에 있던 파일. 단 분리 조건이 적분 루프와 한 몸이라 `launchDynamics.js` 안에 구현했다 |
| `survival.js` | `judgeSurvival(organism, departureAge, elapsed)`, `judgeAll(organisms, ages, result)` | 생존 판정: 출발 나이 + 경과 시간 < 수명 (D-33). `judgeAll`은 생물마다 우주선 탑승(`onShip`)과 지구 잔류(`onEarth`) 두 경우를 돌려준다 |
