@echo off
title Track Spec
cd /d "%~dp0"
color 0A

echo.
echo  ==========================================
echo    TRACK SPEC
echo  ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  color 0C
  echo  [ERROR] Node.js is not installed.
  echo.
  echo  Download and install from: https://nodejs.org/
  echo  Then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo  Installing dependencies (first time only)...
  call npm install
  if errorlevel 1 (
    color 0C
    echo  [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

REM Always stop an old server so we never serve a stale dist
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo  Stopping previous server on port 3000...
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
  )
  timeout /t 1 /nobreak >nul
)

echo  Building app (fresh)...
call npm run build
if errorlevel 1 (
  color 0C
  echo  [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo  Allowing through Windows Firewall...
netsh advfirewall firewall add rule name="Track Spec" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1

echo  Starting server...
echo.
start "" "http://localhost:3000"
node server.js
if errorlevel 1 (
  color 0C
  echo.
  echo  [ERROR] Server failed to start.
  echo  Port 3000 may be in use by another app.
  echo.
  pause
)
