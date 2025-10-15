#!/bin/bash

# Passport OCR - 完整重建部署脚本
# 用于前端变更或依赖变更时重建镜像
# 使用方法：chmod +x rebuild-deploy.sh && ./rebuild-deploy.sh

set -e

PROJECT_DIR="/srv/projects/passport_ocr"

echo "=========================================="
echo "  Passport OCR - 完整重建部署"
echo "=========================================="

cd $PROJECT_DIR

echo "[1/4] 拉取最新代码..."
git pull

echo "[2/4] 停止现有服务..."
docker-compose -f docker-compose.prod.yml down

echo "[3/4] 重建镜像并启动服务..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "[4/4] 验证服务状态..."
sleep 10
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "完整重建部署完成！"
echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
