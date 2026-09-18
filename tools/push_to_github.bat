@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Space_project - GitHub 올리기
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [오류] git이 설치돼 있지 않습니다.
  echo        https://git-scm.com/download/win 에서 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

rem 이력(.git)이 있는 사본을 찾는다. 없으면 zip에서 푼다.
if exist "Space_project\.git" goto have_repo
if exist ".git" goto here_repo

if not exist "Space_project.zip" (
  echo [오류] Space_project.zip 도, 이력이 있는 Space_project 폴더도 없습니다.
  echo        이 파일을 zip과 같은 폴더에 두고 실행하세요.
  echo.
  pause
  exit /b 1
)

echo zip에서 이력이 들어 있는 사본을 푸는 중입니다...
if exist "_push_repo" rmdir /s /q "_push_repo"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath 'Space_project.zip' -DestinationPath '_push_repo' -Force"
if errorlevel 1 (
  echo [오류] zip을 푸는 데 실패했습니다.
  pause
  exit /b 1
)
set REPO=_push_repo\Space_project
goto do_push

:have_repo
set REPO=Space_project
goto do_push

:here_repo
set REPO=.

:do_push
cd /d "%~dp0%REPO%"
echo.
echo 저장소 위치: %CD%
echo 마지막 커밋:
git log --oneline -1
echo.
echo 올릴 커밋 목록:
git log origin/main..HEAD --oneline
echo.
echo ------------------------------------------
echo GitHub로 올립니다.
echo 로그인 창이 뜨면 GitHub 계정으로 로그인만 해 주세요.
echo ------------------------------------------
echo.
git push origin main
if errorlevel 1 (
  echo.
  echo [실패] 위 메시지를 확인하세요.
  echo        비밀번호를 물으면 GitHub 비밀번호가 아니라 개인 액세스 토큰이 필요합니다.
  echo        github.com - Settings - Developer settings - Personal access tokens 에서 만들 수 있습니다.
) else (
  echo.
  echo [성공] 모두 올라갔습니다.
  echo        저장소: https://github.com/goguggi/Space_project
  echo        게시 사이트는 1~2분 뒤 갱신됩니다: https://goguggi.github.io/Space_project/
)
echo.
pause
