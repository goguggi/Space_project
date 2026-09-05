# CLAUDE.md — 이 저장소에서 Claude Code가 지켜야 할 것

이 파일은 Claude Code가 저장소를 열 때 자동으로 읽는다. 어느 컴퓨터에서 열든 여기 적힌 대로 이어서 작업한다.

## 0. 시작할 때 반드시 할 일 (순서대로)

1. `docs/09_current_status.md`를 읽는다. 완료된 것, 진행 중인 것, 다음 할 일이 적혀 있다.
2. `docs/04_roadmap.md`에서 다음 단계의 "만드는 것 / 완료 조건 / 적용할 결정"을 읽는다.
3. `docs/06_decisions.md`에서 확정된 결정(D)과 미결 질문(Q)을 확인한다.
4. 로컬 서버를 띄우고(4절) 검증 페이지가 통과하는지 확인한 뒤 작업을 시작한다.
5. 사용자에게 시작 명령을 설명하지 않는다. 사용자는 "이어서 해"라고만 말한다. 나머지는 Claude Code가 한다.

## 1. 프로젝트

- 이름: 우주여행 시간 지연 계산기 + 3D 발사 시뮬레이션
- 저장소: https://github.com/goguggi/Space_project (main 브랜치)
- 게시: https://goguggi.github.io/Space_project/ (GitHub Pages, main 루트, 푸시 후 1~2분 뒤 갱신)
- 기술: HTML / CSS / JavaScript ES 모듈, Three.js r170(동봉), 외부 라이브러리 그 외 없음
- 문서 목차: `docs/INDEX.md`

## 2. 작업 규칙 (사용자가 정한 것, 바꾸지 않는다)

- **한 번에 한 단계씩** 구현한다. 단계 순서는 `docs/04_roadmap.md`의 진행 순서 표를 따른다.
- **기능별로 파일을 분리**한다. 한 파일은 한 역할. 폴더 역할과 의존 방향은 `src/README.md`.
- **폴더마다 README.md 하나**가 있고, 파일을 추가·변경하면 그 폴더의 README.md를 같이 갱신한다.
- md 파일을 추가·삭제하면 `docs/INDEX.md` 목차를 갱신한다.
- 새 기능을 계획하면 `docs/07_feature_plans.md`에 "기능 N" 항목으로 추가한다.
- **물리 법칙·학술 사실이 아닌 결정은 임의로 하지 않는다.** 사용자에게 묻는다(AskUserQuestion 사용). 답을 받으면 `docs/06_decisions.md`에 D-번호로 기록하고, 묻기 전에는 Q-번호로 적어 둔다.
- 화면 문자열, 주석, 문서는 **한국어**. 변수·함수·파일 이름은 영어.
- 숫자(상수, 거리, 수명, 제원)는 `src/data/`에만 두고 옆에 출처를 주석으로 남긴다. 값의 근거는 `docs/05_data_reference.md`와 일치시킨다.
- `src/physics/`는 DOM을 모른다. `src/launch/`만 Three.js를 import한다.
- 계산 함수를 추가하면 `tests/physics.test.js`에 검증 항목을 추가한다.

## 3. Git 규칙

- 단계 하나가 끝나면(완료 조건 충족 + 브라우저 확인 + 검증 페이지 통과) 커밋하고 푸시한다. 사용자가 "푸시는 하지 마"라고 하지 않는 한 푸시까지 한다.
- 커밋 메시지는 한국어. 첫 줄은 `N단계: 요약`. 문서만 바꿨으면 내용 요약.
- 커밋 작성자가 설정되어 있지 않으면 `git -c user.name="genai06" -c user.email="genai06@cdsai.kr" commit ...` 처럼 명령에 붙여 쓴다. (이 저장소 소유자의 계정)
- 푸시할 때 GitHub 로그인 창이 뜨면 사용자에게 "로그인 창에서 로그인만 해 달라"고 한 번 요청한다. 토큰이나 비밀번호를 파일·명령·채팅에 적지 않는다.
- 작업이 끝나지 않은 채 세션을 마쳐야 하면, 진행 중 상태 그대로 커밋·푸시하고 `docs/09_current_status.md`에 "진행 중"으로 남긴다.
- 단계가 끝날 때마다 `docs/09_current_status.md`의 표와 "진행 중" 절, `README.md`의 현재 상태, `docs/04_roadmap.md`의 상태 열을 갱신한다.

## 4. 실행과 확인 방법

- ES 모듈이라 `index.html`을 더블클릭하면 안 된다. 로컬 서버가 필요하다.
- 로컬 서버: `.claude/launch.json`의 `local-server` 설정으로 Claude Code의 미리보기(preview_start)를 쓴다. 이 설정은 `powershell -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8000`을 실행한다.
  - PowerShell이 없는 환경(맥·리눅스)이면 `python -m http.server 8000` 또는 Node의 정적 서버로 대신하고, `.claude/launch.json`을 그 환경에 맞게 고친다.
  - 이 저장소를 만든 컴퓨터에는 Python과 Node가 없었다. 집 컴퓨터는 다를 수 있으니 먼저 확인한다.
- 확인 순서: 메인 화면 http://localhost:8000 → 검증 페이지 http://localhost:8000/tests/physics.test.html ("N / N 통과" 확인).
- 발사 장면 확인은 브라우저 탭이 **앞에 있는 상태**에서 한다. 탭이 숨겨지면 requestAnimationFrame이 멈춘다(setTimeout 대체 경로가 있어 시뮬레이션은 느리게라도 진행됨).
- 브라우저 콘솔에서 `window.__state`로 현재 선택값, 계산 결과(`result`), 발사 컨트롤러(`launch`)를 볼 수 있다. `window.__state.launch.timeline.sim.bodies`가 분리된 단들의 상태.
- 검증에 쓴 방식: 자바스크립트로 발사 버튼과 건너뛰기를 누른 뒤 `timeline.getEvents()`와 `sim.bodies`를 읽어 사건 시각·접지 속도·목표 위치를 비교한다.

## 5. 환경 주의점

- `tools/serve.ps1`은 한글 주석 때문에 **UTF-8 BOM**으로 저장되어야 한다. 편집 도구가 BOM을 지우면 Windows PowerShell 5.1이 구문 오류를 낸다.
- 긴 heredoc을 Bash로 쓰면 이 환경에서 실패한 적이 있다. 파일은 Write/Edit 도구로 만든다.
- Git이 LF→CRLF 경고를 내지만 무시해도 된다.
- `.claude/` 폴더는 `launch.json`만 저장소에 포함한다(나머지는 .gitignore).

## 6. 로켓 설계 프로그램 (다른 팀원)

- 별도 저장소에서 다른 팀원이 만든다. 인수 문서는 `docs/08_rocket_design_handoff.md`, 계약 예제는 `docs/examples/falcon_heavy.rocket.json`.
- 이 저장소의 16단계(설계한 로켓 불러오기)가 그 JSON을 읽는다. 발사 물리는 처음부터 그 형식(`stages[]`)을 쓰도록 되어 있다.
- 설계 저장소 주소와 부품 목록 등은 미결(Q-19~Q-23). 팀원 답이 오면 `docs/06_decisions.md`에 기록한다.
