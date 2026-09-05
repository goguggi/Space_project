# .github/ — GitHub 설정

GitHub가 읽는 설정 파일을 두는 폴더다. 프로그램 코드가 아니다.

## 현재 상태

- GitHub Pages는 저장소 설정(Settings → Pages)에서 **main 브랜치 / (root)** 로 켜 두었다 (D-46, 2026-09-05).
  main에 푸시하면 GitHub가 자동으로 다시 게시한다. 별도 워크플로는 필요 없다.
- 처음에 두었던 Actions 워크플로(`workflows/pages.yml`)는 워크플로 토큰으로 Pages를 새로 만들 권한이 없어 실패했으므로 제거했다.
- 저장소 최상위의 `.nojekyll` 파일은 Pages의 Jekyll 처리를 건너뛰게 한다. (파일을 그대로 올리므로 더 빠르고, 밑줄로 시작하는 경로가 무시되는 문제를 피한다)

## 게시 주소

https://goguggi.github.io/Space_project/

## 동작 확인

저장소의 Actions 탭에 "pages build and deployment" 실행이 초록색이면 성공이다. 푸시 후 1~2분 걸린다.
