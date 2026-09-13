# 우주여행 시간 지연 계산기

지구의 발사장에서 출발한 우주선이 태양계 또는 우주의 특정 천체까지 이동할 때,
속도와 이동 거리에 따라 발생하는 **상대론적 시간 지연**을 계산하고,
그 결과를 **여러 생물의 수명**과 비교하여 직관적으로 보여주는 웹 프로그램입니다.

- 플랫폼: HTML / CSS / JavaScript (3D 발사 장면에만 Three.js 사용, 그 외 외부 라이브러리 없음)
- 언어: 화면, 주석, 문서 모두 한국어
- 버전 관리: Git, 원격 저장소 https://github.com/goguggi/Space_project.git
- 실행: GitHub Pages로 게시 → **https://goguggi.github.io/Space_project/** (main 푸시마다 자동 갱신). 로컬에서는 로컬 서버로 확인

## 문서 안내

**이어서 개발하려면**: Claude Code로 이 저장소를 열고 "이어서 해"라고 하면 됩니다. Claude Code는 [CLAUDE.md](CLAUDE.md)(작업 규칙)와 [docs/09_current_status.md](docs/09_current_status.md)(현재 상황)를 읽고 다음 단계를 진행합니다.

모든 문서의 목차는 [docs/INDEX.md](docs/INDEX.md)에 있습니다.
개발을 시작하기 전에 반드시 아래 순서로 읽습니다.

1. [요구사항 정리](docs/01_requirements.md)
2. [프로젝트 구조와 코드 관리 원칙](docs/02_architecture.md)
3. [물리 공식과 계산 방법](docs/03_physics.md)
4. [단계별 개발 계획](docs/04_roadmap.md)
5. [기초 데이터와 출처](docs/05_data_reference.md)
6. [의사결정 기록과 미결 질문](docs/06_decisions.md)
7. [기능 계획 누적 기록](docs/07_feature_plans.md)
8. [로켓 설계 프로그램 인수 문서](docs/08_rocket_design_handoff.md) (설계 담당 팀원은 이 문서부터)

## 실행 방법 (로컬)

**가장 간단한 방법 (서버 없이)**: 저장소 최상위의 **`열기.html`을 두 번 누른다.**
모든 코드와 스타일이 이 파일 한 개에 들어 있어서 로컬 서버도 인터넷도 필요 없다.
계산 검증 페이지는 같은 방식의 **`검증.html`**이다.
두 파일은 `tools/build_single.py`가 만든 결과물이므로, **코드를 고치면 `python tools/build_single.py`를 다시 실행**해서 갱신한다.

**개발할 때 (로컬 서버)**: **`실행.bat`을 두 번 누른다.** 로컬 서버가 뜨고 2초 뒤 브라우저에서
`http://localhost:8000` 이 열린다. 소스를 고치고 새로 고치면 바로 반영되므로 개발 중에는 이쪽이 편하다.

직접 띄우려면 저장소 최상위에서 아래 중 하나를 실행한 뒤 브라우저로 `http://localhost:8000` 을 연다.

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
python -m http.server 8000
```

`index.html`을 파일로 바로 열면(file://) ES 모듈이 막혀서 화면이 비어 보인다. 서버 없이 보려면 `열기.html`을 쓴다.

## 현재 상태 (2026-09-13)

- 완료: 0~7단계(계산기 핵심), 10~15단계(3D 발사·항행), 17~21단계(시점·소리·착륙·탐사·연출)
- 계산 검증: `tests/physics.test.html` 112 / 112 통과
- 다음: **16단계 — 설계한 로켓 불러오기(JSON)** → 8단계(가속-감속 모델) → 9단계(마무리)
- 자세한 인수인계는 [docs/09_current_status.md](docs/09_current_status.md), 결정 기록은 [docs/06_decisions.md](docs/06_decisions.md)

### 21단계에서 더해진 것

- 발사 순간의 실감 나는 화염(네 겹 + 마하 디스크 + 주변 조명)과 발사대 연기 구름
- 사실적으로 다시 그린 지구(수심·기후대·구름층). NASA 블루마블 사진을 넣으면 그 사진을 쓴다 → [assets/earth/README.md](assets/earth/README.md)
- 진행 막대가 한 칸씩 튀지 않고 계속 차오른다
- 새 배경음(오르간·오스티나토·시계 초침). **속도가 빨라질수록 음악이 늘어진다**(γ에 비례).
  기성곡은 저작권 때문에 넣지 않는다. 원하는 음원이 있으면 "🎵 내 음악" 단추로 직접 튼다
