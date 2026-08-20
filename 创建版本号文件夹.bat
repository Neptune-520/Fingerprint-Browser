@echo off
cd /d "%~dp0"
echo ========================================================
echo   Fingerprint Browser - 创建版本号文件夹并整理 Release 文件
echo ========================================================
echo.

node scripts/prepare-release-folder.js

echo.
pause
