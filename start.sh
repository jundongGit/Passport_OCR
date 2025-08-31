#!/bin/bash

echo "🚀 启动护照识别系统..."

# 检查MongoDB是否运行
if ! pgrep -x "mongod" > /dev/null
then
    echo "⚠️  MongoDB未运行，正在启动..."
    if command -v brew &> /dev/null
    then
        brew services start mongodb-community
    else
        echo "请手动启动MongoDB"
        exit 1
    fi
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install

# 启动后端
echo "🔧 启动后端服务..."
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
npm install

# 启动前端
echo "🎨 启动前端应用..."
npm start &
FRONTEND_PID=$!

echo "✅ 系统启动完成！"
echo "📍 后端地址: http://localhost:3060"
echo "📍 前端地址: http://localhost:3000"
echo "📍 管理后台: http://localhost:3000/admin"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait