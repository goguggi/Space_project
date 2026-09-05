# tools/ — 개발 보조 스크립트

프로그램 코드가 아니라, 개발할 때 쓰는 도구를 둔다. GitHub Pages 게시에는 포함되어도 무방하다.

## 파일 목록

| 파일 | 내용 | 추가 단계 |
|---|---|---|
| `serve.ps1` | 로컬 확인용 정적 파일 서버. Python과 Node 없이 PowerShell만으로 `http://localhost:8000`에서 `index.html`을 연다 | 1단계 |

## 로컬 서버 실행

저장소 최상위에서:

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

브라우저에서 `http://localhost:8000` 을 연다. 종료는 Ctrl+C.

## 실행.bat (저장소 최상위)

윈도우에서 두 번 눌러 바로 실행하는 파일. `py` → `python` → `tools/serve.ps1` 순서로 있는 것을 골라
http://localhost:8000 에 로컬 서버를 띄우고 2초 뒤 기본 브라우저로 `index.html`을 연다.
창을 닫거나 Ctrl+C를 누르면 서버가 멈춘다. 내용은 인코딩 문제를 피하려고 영어로만 적었다.

## build_single.py

`python tools/build_single.py` 를 실행하면 저장소 최상위에 **`열기.html`**(계산기 본체)과
**`검증.html`**(계산 검증 페이지)을 만든다. 서버 없이 `file://` 로 두 번 눌러 열 수 있는 파일 하나짜리 실행본이다.

- 원리: 모듈 소스를 문자열로 담아 두고, 브라우저에서 Blob URL로 만들어 import 경로를 그 URL로 바꿔 끼운다.
  모듈 문법과 이름 범위가 그대로 유지되므로 소스를 합칠 때 생기는 이름 충돌이 없다.
  (`index.html`을 file:// 로 바로 열면 ES 모듈이 CORS로 막힌다.)
- **코드·CSS를 고치면 다시 실행해야 한다.** 안 그러면 두 파일이 옛 코드로 남는다.
- 이 두 파일은 생성물이지만, 팀원이 받자마자 두 번 눌러 볼 수 있도록 저장소에 함께 넣어 둔다.
