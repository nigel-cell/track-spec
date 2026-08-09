@echo off
setlocal
cd /d "%~dp0"
title Download KFPS 3.1.7 bundled

set "URL=https://github.com/heyitshestia/kloudys-forza-painter-suite/releases/download/v3.1.7/KFPS-3.1.7-bundled.zip"
set "ZIP=%TEMP%\KFPS-3.1.7-bundled.zip"
set "OUT=%~dp0..\KFPS-3.1.7-bundled"

echo.
echo This downloads the official KFPS 3.1.7 bundled release (~391 MB).
echo That zip is the exact runnable app (includes Python).
echo.
echo Destination: %OUT%
echo.

where curl >nul 2>nul
if %ERRORLEVEL%==0 (
  curl -L "%URL%" -o "%ZIP%"
) else (
  powershell -NoProfile -Command "Invoke-WebRequest -Uri '%URL%' -OutFile '%ZIP%'"
)
if errorlevel 1 (
  echo Download failed.
  pause
  exit /b 1
)

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%OUT%' -Force"
if errorlevel 1 (
  echo Extract failed.
  pause
  exit /b 1
)

echo.
echo Done. Look inside:
echo   %OUT%
echo Double-click KFPS.exe there (or in the KloudysFH6Painter folder if nested).
echo.
explorer "%OUT%"
pause
