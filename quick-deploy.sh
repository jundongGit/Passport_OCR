#!/bin/bash

# Passport OCR - 快速更新脚本
# 用于快速更新代码并重启服务（不重建镜像）
# 使用方法：chmod +x quick-deploy.sh && ./quick-deploy.sh

set -e

PROJECT_DIR="/srv/projects/passport_ocr"

echo "=========================================="
echo "  Passport OCR - 快速更新"
echo "=========================================="

cd $PROJECT_DIR

echo "[1/3] 拉取最新代码..."
git pull

echo "[2/3] 重启服务..."
docker-compose -f docker-compose.prod.yml restart backend

echo "[3/3] 验证服务状态..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "快速更新完成！"
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f backend"
