@echo off
setlocal enabledelayedexpansion

:: Fingerprint Browser v2.0 Launcher for Windows (Win64)
cd /d "%~dp0"

echo [Info] Checking node_modules...
if not exist "node_modules" (
    echo [Info] Installing npm dependencies, please wait...
    call npm install
    if errorlevel 1 (
        echo [Error] npm install failed! Please check your network.
        pause
        exit /b 1
    )
)

echo.
echo [Info] Starting Vite Frontend Dev Server...
start "ViteDevServer" /b npm run dev

echo [Info] Waiting for Vite server to initialize...
timeout /t 2 /nobreak > nul

echo [Info] Launching Electron App...
call npx electron . --dev

echo.
echo [Info] Application exited.
