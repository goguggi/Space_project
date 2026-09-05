@echo off
rem ---------------------------------------------------------------
rem  Space_project local run (Windows)
rem  ES modules do not work from file:// , so this starts a tiny
rem  local web server at http://localhost:8000 and opens the browser.
rem  Close this window (or press Ctrl+C) to stop the server.
rem ---------------------------------------------------------------
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8000

rem open the browser 2 seconds later, after the server is up
start "" /min cmd /c "timeout /t 2 >nul & start "" http://localhost:%PORT%/index.html"

where py >nul 2>nul
if %errorlevel%==0 (
    py -m http.server %PORT%
    goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
    python -m http.server %PORT%
    goto :eof
)
powershell -ExecutionPolicy Bypass -File "tools\serve.ps1" -Port %PORT%
