@echo off
cd /d "%~dp0"
start "" "http://localhost:3000"
echo Opened http://localhost:3000 in your browser.
echo.
echo If the page does not load, run START.bat first.
timeout /t 5 >nul
