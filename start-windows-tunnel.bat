@echo off
REM ============================================================
REM  Trace - launcher that works even when your two phones and
REM  your PC are on DIFFERENT Wi-Fi networks (uses a tunnel).
REM  Use this if the normal start-windows.bat QR won't connect.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo   Starting Trace ^(tunnel mode^)...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed. Get it from https://nodejs.org ^(LTS^),
  echo   then double-click this file again.
  pause
  exit /b 1
)
if not exist "package.json" (
  echo   [X] Run this from inside the "trace" project folder.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo   First run - installing dependencies ^(a few minutes^)...
  call npm install || ( echo   Install failed - run again to retry. & pause & exit /b 1 )
)
if not exist ".env" copy /y ".env.example" ".env" >nul

echo.
echo   A QR code will appear. Scan it on BOTH phones with Expo Go.
echo   Tunnel mode is a little slower to start - give it a minute.
echo.
call npx expo start --tunnel

echo.
pause
endlocal
