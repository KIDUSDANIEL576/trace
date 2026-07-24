@echo off
REM ============================================================
REM  Trace - one-double-click launcher for Windows.
REM  Just double-click this file. It handles the rest.
REM ============================================================
setlocal

REM Always run from THIS file's folder, no matter where it's launched from.
REM (This is the #1 thing people get wrong: running from C:\Users\You
REM  instead of the project folder.)
cd /d "%~dp0"

echo.
echo   Starting Trace...
echo   Folder: %CD%
echo.

REM --- 1. Is Node installed? ---------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed.
  echo.
  echo   Install it once from:  https://nodejs.org  ^(pick the "LTS" button^)
  echo   Then double-click this file again.
  echo.
  pause
  exit /b 1
)

REM --- 2. Are we actually in the project? ---------------------
if not exist "package.json" (
  echo   [X] This doesn't look like the Trace project folder.
  echo   Make sure start-windows.bat is inside the "trace" folder,
  echo   next to package.json, and run it from there.
  echo.
  pause
  exit /b 1
)

REM --- 3. First-run setup: dependencies ----------------------
if not exist "node_modules" (
  echo   First run - installing dependencies. This takes a few minutes...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [X] npm install failed - usually a flaky network.
    echo   Just double-click this file again to retry.
    echo.
    pause
    exit /b 1
  )
)

REM --- 4. First-run setup: environment file ------------------
if not exist ".env" (
  echo   Creating .env from the template...
  copy /y ".env.example" ".env" >nul
)

REM --- 5. Launch -------------------------------------------
echo.
echo   Ready. A QR code will appear below.
echo   On BOTH phones: open Expo Go and scan it.
echo   ^(iOS: use the Camera app to scan. Android: scan inside Expo Go.^)
echo.
echo   If the phones can't connect, close this window and run
echo   start-windows-tunnel.bat instead ^(works across different Wi-Fi^).
echo.
call npx expo start

REM Keep the window open if expo exits, so any error stays readable.
echo.
pause
endlocal
