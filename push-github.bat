@echo off
cd /d "%~dp0"
echo ========================================================
echo   Fingerprint Browser - 代码与 Tag 推送至 GitHub 脚本
echo ========================================================
echo.

set /p msg=请输入 Git Commit 提交说明 (直接按回车默认使用版本号提交): 

if "%msg%"=="" (
    node scripts/push-github.js
) else (
    node scripts/push-github.js "%msg%"
)

echo.
pause
