@echo off
cd /d "%~dp0"
echo ========================================================
echo   Fingerprint Browser - Windows EXE 打包脚本
echo ========================================================
echo.

node scripts/build-exe.js

echo.
pause
