@echo off
cd /d "%~dp0"
echo ========================================================
echo   Fingerprint Browser - 一键完成 打包 + 归档 + 推送 GitHub
echo ========================================================
echo.

echo [步骤 1/3] 开始打包 Windows EXE...
call node scripts/build-exe.js
if errorlevel 1 goto error

echo.
echo [步骤 2/3] 按 package.json 版本号整理 Release 目录...
call node scripts/prepare-release-folder.js
if errorlevel 1 goto error

echo.
echo [步骤 3/3] 推送代码及 Tag 到 GitHub (触发 GitHub Actions)...
set /p msg=请输入 Git Commit 提交说明 (回车默认自动按版本号提交): 

if "%msg%"=="" (
    node scripts/push-github.js
) else (
    node scripts/push-github.js "%msg%"
)
if errorlevel 1 goto error

echo.
echo ========================================================
echo   🎉 全流程成功完成！应用已打包、归档并推送至 GitHub！
echo ========================================================
goto end

:error
echo.
echo ❌ 执行流程中遇到错误，已中止！
pause
exit /b 1

:end
pause
