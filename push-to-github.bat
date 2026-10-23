@echo off
title Push Jen Bot to GitHub (devwhitex/jen)
color 0b
echo ======================================================
echo    Pushing Discord Bot to https://github.com/devwhitex/jen.git
echo ======================================================
echo.
cd /d "%~dp0"

echo Running: git push -u origin main
echo (If a GitHub browser window opens, click "Sign in with browser")
echo.
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    color 0a
    echo.
    echo ======================================================
    echo   [SUCCESS] Your bot is now live on GitHub!
    echo   Repository: https://github.com/devwhitex/jen
    echo ======================================================
) else (
    color 0c
    echo.
    echo ======================================================
    echo   If you saw an authentication error:
    echo   GitHub requires a Personal Access Token or browser login.
    echo ======================================================
)
echo.
pause
