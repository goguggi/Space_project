# 우주여행 시간 지연 계산기

지구의 발사장에서 출발한 우주선이 태양계 또는 우주의 특정 천체까지 이동할 때,
속도와 이동 거리에 따라 발생하는 **상대론적 시간 지연**을 계산하고,
그 결과를 **여러 생물의 수명**과 비교하여 직관적으로 보여주는 웹 프로그램입니다.

- 플랫폼: HTML / CSS / JavaScript (3D 발사 장면에만 Three.js 사용, 그 외 외부 라이브러리 없음)
- 언어: 화면, 주석, 문서 모두 한국어
- 버전 관리: Git, 원격 저장소 https://github.com/goguggi/Space_project.git
- 실행: GitHub Pages로 게시 → **https://goguggi.github.io/Space_project/** (main 푸시마다 자동 갱신). 로컬에서는 로컬 서버로 확인

## 문서 안내

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

저장소 최상위에서 아래를 실행한 뒤 브라우저로 `http://localhost:8000` 을 연다.

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

## 현재 상태

- 0단계(계획 수립, 문서 작성, 폴더 골격 생성) 완료
- 1~7단계(계산기 핵심: 발사장, 목적지, 속도, 계산 엔진, 결과 표, 스톱워치, 생물 비교) 완료 (2026-09-05)
- 계산 검증: `tests/physics.test.html` 13 / 13 통과
- 10~12단계(Three.js r170 도입, 3D 장면, 팔콘 헤비 발사 물리와 추적 카메라, 단 분리와 독립 낙하) 완료
- 계산 검증: `tests/physics.test.html` 19 / 19 통과
- 다음: 13단계(재착륙 유도)
- 기능 1(3D 발사 시뮬레이션) 계획 추가됨 (2026-09-05). 10~15단계로 배정
- 미결 질문 18개 모두 답변 완료 (2026-09-05). 진행 순서: 1~7 → 10~15 → 8 → 9
