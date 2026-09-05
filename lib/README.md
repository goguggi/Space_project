# lib/ — 동봉한 외부 라이브러리

프로젝트에 직접 포함시킨 외부 라이브러리를 둔다. 인터넷 연결 없이 실행하기 위해 파일을 동봉한다.
이 폴더의 파일은 **수정하지 않는다.**

## 목록

| 폴더 | 라이브러리 | 버전 | 용도 | 사용 위치 |
|---|---|---|---|---|
| `three/` | Three.js | **r170 (0.170.0)**, ES 모듈 빌드 (D-45). MIT 라이선스 | 3D 발사 장면 | `src/launch/` 전용 |

## 현재 파일 목록

| 파일 | 출처 | 설명 |
|---|---|---|
| `three/three.module.js` | https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js | Three.js 본체 (약 1.3 MB) |
| `three/OrbitControls.js` | https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js | 마우스로 카메라를 돌리는 부속 모듈. 이 파일이 `'three'`라는 이름으로 본체를 찾으므로 `index.html`에 import map(`"three" → "./lib/three/three.module.js"`)이 있다 |

버전을 올릴 때는 두 파일을 같은 버전으로 함께 바꾸고, 이 표와 [docs/06_decisions.md](../docs/06_decisions.md) D-45를 갱신한다.
로켓 설계 프로그램(별도 저장소)도 같은 버전을 쓴다 (Q-22).
