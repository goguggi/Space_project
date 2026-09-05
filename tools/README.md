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
