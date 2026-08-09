@echo off
setlocal
cd /d "%~dp0"
title Vinyl Spec / KFPS 3.1.7

if exist "KFPS.exe" (
  echo Starting KFPS 3.1.7 ...
  start "" "%~dp0KFPS.exe"
  exit /b 0
)

echo KFPS.exe not found.
echo.
echo For the exact official 3.1.7 experience, run GET_BUNDLED.bat
echo or download:
echo   https://github.com/heyitshestia/kloudys-forza-painter-suite/releases/download/v3.1.7/KFPS-3.1.7-bundled.zip
echo.
pause
