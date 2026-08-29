@echo off
title Smart Mandi Queue Management System
echo ================================================================
echo 🌾 Launching Smart Mandi Queue Management System...
echo ================================================================

cd /d "%~dp0"

REM Ensure local node directory is in PATH if installed there
if exist "%LOCALAPPDATA%\Programs\nodejs" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)

echo Starting Backend API on http://localhost:5000 ...
start "Smart Mandi Backend API" cmd /k "cd /d "%~dp0backend" && node src/server.js"

timeout /t 2 /nobreak >nul

echo Starting Frontend on http://localhost:3000 ...
start "Smart Mandi Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:3000 ...
start http://localhost:3000

echo ================================================================
echo ✅ Smart Mandi is running!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:5000
echo ================================================================
pause
