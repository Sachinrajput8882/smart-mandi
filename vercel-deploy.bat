@echo off
title Vercel Deploy - Smart Mandi
echo ================================================================
echo ▲ Linking & Deploying Smart Mandi to Vercel
echo ================================================================
echo.

cd /d "%~dp0"

echo [Step 1/2] Linking to your Vercel Project...
echo (If prompted, log in with GitHub/Email in your browser)
echo.
call npx vercel link

if %errorlevel% neq 0 (
    echo.
    echo Linking failed or needs login. Starting Vercel login...
    call npx vercel login
    call npx vercel link
)

echo.
echo [Step 2/2] Deploying to Production (--prod)...
echo.
call npx vercel --prod

echo.
echo ================================================================
echo ✅ Deployment finished!
echo ================================================================
pause
