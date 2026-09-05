# 문서 목차 (INDEX)

프로젝트의 모든 md 파일 목록이다. md 파일을 추가하거나 삭제하면 이 목차를 함께 갱신한다.

## 프로젝트 소개

| 파일 | 내용 |
|---|---|
| [../README.md](../README.md) | 프로젝트 개요, 문서 읽는 순서, 현재 상태 |

## 계획과 설계 문서 (docs/)

| 파일 | 내용 |
|---|---|
| [01_requirements.md](01_requirements.md) | 확정된 요구사항, 범위 밖 항목 |
| [02_architecture.md](02_architecture.md) | 폴더 구조, 파일 분리 원칙, 이름 규칙, Git 규칙 |
| [03_physics.md](03_physics.md) | 물리 상수, 등속 모델 공식, 가속 모델 공식, 수치 계산 주의점, 검증 기준값 |
| [04_roadmap.md](04_roadmap.md) | 0~9단계 개발 계획, 단계별 완료 조건 |
| [05_data_reference.md](05_data_reference.md) | 발사장 좌표, 천체 거리, 속도 기준값, 생물 수명과 출처 |
| [06_decisions.md](06_decisions.md) | 확정된 결정(D-01~D-47), 물리 근거 결정(P), 미결 질문(현재 없음) |
| [07_feature_plans.md](07_feature_plans.md) | 기능 계획 누적 기록. 새 기능을 계획할 때마다 하나씩 추가 |
| [08_rocket_design_handoff.md](08_rocket_design_handoff.md) | 로켓 설계 프로그램 담당자용 인수 문서. JSON 형식, 검증 규칙, 개발 단계 |
| [examples/falcon_heavy.rocket.json](examples/falcon_heavy.rocket.json) | 로켓 제원 JSON 기준 예제 (md 아님, 계약 파일) |

## 폴더별 코드 설명 (src/, tests/)

| 파일 | 설명 대상 |
|---|---|
| [../src/README.md](../src/README.md) | 소스 코드 전체 구성과 폴더 간 의존 관계 |
| [../src/data/README.md](../src/data/README.md) | 상수와 기초 데이터 파일 |
| [../src/physics/README.md](../src/physics/README.md) | 계산 로직 파일 |
| [../src/ui/README.md](../src/ui/README.md) | 화면 구성 요소 파일 |
| [../src/launch/README.md](../src/launch/README.md) | 3D 발사 장면 파일 (Three.js) |
| [../src/utils/README.md](../src/utils/README.md) | 단위 변환, 서식 등 공통 도우미 파일 |
| [../src/styles/README.md](../src/styles/README.md) | CSS 파일 |
| [../tests/README.md](../tests/README.md) | 계산 검증 테스트 파일 |
| [../tools/README.md](../tools/README.md) | 개발 보조 스크립트 (로컬 서버 실행 방법) |

## 외부 라이브러리 (lib/)

| 파일 | 설명 대상 |
|---|---|
| [../lib/README.md](../lib/README.md) | 동봉한 외부 라이브러리 목록과 버전 |
