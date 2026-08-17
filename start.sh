#!/bin/bash
echo "======================================================"
echo "   多浏览器隔离系统 v2.0 (Electron 3x + Vue 3) 启动器"
echo "======================================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

if [ ! -d "node_modules" ]; then
    echo "[Info] 正在自动安装项目 Node 依赖，请稍候..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[Error] 依赖安装失败，请检查网络或 npm 环境！"
        exit 1
    fi
fi

echo ""
echo "[Info] 正在启动 Vite 前端开发服务..."
npm run dev &
VITE_PID=$!

echo "[Info] 正在等待服务准备完毕 (3秒)..."
sleep 3

echo "[Info] 正在拉起 Electron 桌面应用主进程..."
npx electron . --dev

kill $VITE_PID 2>/dev/null
