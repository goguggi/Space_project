# 02. 프로젝트 구조와 코드 관리 원칙

## 1. 폴더 구조

```
team_project/
├── README.md                # 프로젝트 소개, 문서 안내
├── .gitignore
├── index.html               # 프로그램 진입점 (1단계에서 생성)
├── docs/                    # 계획, 설계, 근거 문서
│   ├── INDEX.md             # 전체 md 파일 목차
│   ├── 01_requirements.md   # 요구사항 정리
│   ├── 02_architecture.md   # 이 문서
│   ├── 03_physics.md        # 물리 공식과 계산 방법
│   ├── 04_roadmap.md        # 단계별 개발 계획
│   ├── 05_data_reference.md # 기초 데이터와 출처
│   ├── 06_decisions.md      # 의사결정 기록, 미결 질문
│   └── 07_feature_plans.md  # 기능 계획 누적 기록 (새 기능마다 추가)
├── lib/                     # 동봉한 외부 라이브러리 (수정 금지)
│   ├── README.md
│   └── three/               # Three.js (3D 발사 장면 전용)
├── src/                     # 소스 코드
│   ├── README.md
│   ├── data/                # 상수와 기초 데이터 (발사장, 천체, 생물, 물리 상수)
│   │   └── README.md
│   ├── physics/             # 계산 로직 (로런츠 인자, 시간 지연, 운동 모델)
│   │   └── README.md
│   ├── ui/                  # 화면 구성 요소 (선택 메뉴, 슬라이더, 표, 스톱워치, 그래프)
│   │   └── README.md
│   ├── launch/              # 3D 발사 장면 (Three.js 사용: 장면, 로켓 모델, 카메라, HUD)
│   │   └── README.md
│   ├── utils/               # 단위 변환, 숫자 서식 등 공통 도우미
│   │   └── README.md
│   └── styles/              # CSS
│       └── README.md
└── tests/                   # 계산 검증용 테스트
    └── README.md
```

## 2. 파일 분리 원칙

1. **한 파일은 한 가지 역할만** 맡는다.
   예: `physics/lorentz.js`는 로런츠 인자 계산만, `ui/speedSlider.js`는 속도 슬라이더만 다룬다.
2. **데이터와 로직을 분리**한다.
   천체 거리, 발사장 좌표, 생물 수명 같은 값은 `src/data/`에만 둔다. 계산 코드에 숫자를 직접 쓰지 않는다.
3. **계산과 화면을 분리**한다.
   `src/physics/`는 DOM(화면 요소)을 전혀 모른다. 입력 숫자를 받아 출력 숫자를 돌려주는 순수 함수만 둔다.
   `src/ui/`는 계산 함수를 호출하고 결과를 화면에 그리기만 한다.
   `src/launch/`도 같은 원칙을 따른다. 발사 물리는 `src/physics/`에 두고, `src/launch/`는 Three.js로 그리기만 한다.
   Three.js를 불러오는 파일은 `src/launch/` 안의 파일로 한정한다.
4. **폴더마다 README.md 하나**를 두고, 파일이 추가되거나 바뀔 때마다 그 폴더의 README.md를 함께 갱신한다.
5. **문서 목차([INDEX.md](INDEX.md))** 는 md 파일이 추가/삭제될 때마다 갱신한다.

## 3. 파일 이름 규칙

- 소스 파일: 영어 소문자 camelCase (`launchSites.js`, `timeDilation.js`)
- 문서 파일: 영어 (`01_requirements.md`), 내용은 한국어
- 파일 이름을 영어로 쓰는 이유: 경로 인코딩 문제와 Git 호환성 때문이며, 내용은 모두 한국어로 작성한다.

## 4. 코드 작성 규칙

- 모든 주석과 화면 문자열은 한국어로 쓴다.
- 변수명, 함수명은 영어로 쓴다.
- 물리 상수는 `src/data/constants.js`에 한 곳에만 정의하고, 정의 옆에 출처를 주석으로 남긴다.
- 함수마다 입력 단위와 출력 단위를 주석에 명시한다. (예: `// 입력: 속도 m/s, 출력: 무차원`)

## 5. 스크립트 로딩과 실행 방식 (확정, D-27)

- 모든 소스 파일은 **ES 모듈**(`import` / `export`)로 작성한다.
- 프로그램은 **GitHub Pages**(main 브랜치 루트)로 게시하며, 웹 서버를 통해 열리므로 ES 모듈과 최신 Three.js가 그대로 동작한다.
- 로컬에서 확인할 때는 `index.html`을 더블클릭하지 말고 로컬 서버로 연다. (file:// 프로토콜에서는 ES 모듈이 브라우저 보안 정책에 막힌다.)
  예: VS Code의 Live Server 확장, 또는 아래 명령 후 `http://localhost:8000` 접속

```bash
python -m http.server 8000
```

- Three.js는 ES 모듈 빌드(`three.module.js`)를 `lib/three/`에 동봉하고 `src/launch/`에서만 `import`한다.

## 6. Git과 GitHub 사용 규칙

- 원격 저장소: https://github.com/goguggi/Space_project.git (D-47)
- 게시: GitHub Pages, main 브랜치 루트 (D-46). main에 푸시하면 게시된 사이트가 갱신된다.
- 개발 단계([04_roadmap.md](04_roadmap.md)) 하나가 끝날 때마다 커밋한다.
- 커밋 메시지는 한국어로, 첫 줄에 단계 번호와 요약을 쓴다. (예: `1단계: 발사장 선택 기능 구현`)
- 푸시는 사용자가 지시할 때만 한다.
