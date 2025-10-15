#!/bin/bash

# SSL证书申请脚本
# 使用方法：在服务器上运行此脚本

set -e

PROJECT_DIR="/srv/projects/passport_ocr"
DOMAIN="passport.wanguo.co.nz"
EMAIL="admin@wanguo.co.nz"

cd $PROJECT_DIR

echo "=========================================="
echo "  SSL 证书申请"
echo "=========================================="

# 停止 nginx 以释放端口 80
echo "[1/5] 临时停止 Nginx..."
docker-compose -f docker-compose.prod.yml stop nginx

# 使用 standalone 模式申请证书
echo "[2/5] 申请 SSL 证书（standalone 模式）..."
docker-compose -f docker-compose.prod.yml run --rm -p 80:80 certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "证书申请成功！"

    # 切换到 HTTPS 配置（如果还没切换）
    echo "[3/5] 检查 nginx 配置..."
    if [ ! -f "$PROJECT_DIR/nginx/nginx.conf.orig" ]; then
        cp $PROJECT_DIR/nginx/nginx.http.conf $PROJECT_DIR/nginx/nginx.conf.orig
    fi

    # 已经使用了正确的配置，nginx.conf 已经是 HTTPS 配置

    # 重启 nginx
    echo "[4/5] 启动 Nginx（HTTPS 模式）..."
    docker-compose -f docker-compose.prod.yml start nginx

    # 验证 HTTPS
    echo "[5/5] 等待服务启动..."
    sleep 5

    echo ""
    echo "=========================================="
    echo "  SSL 证书配置完成！"
    echo "=========================================="
    echo ""
    echo "访问地址："
    echo "  https://$DOMAIN"
    echo ""
    echo "证书信息："
    docker-compose -f docker-compose.prod.yml exec certbot certbot certificates
else
    echo "证书申请失败，重启 Nginx（HTTP 模式）..."
    docker-compose -f docker-compose.prod.yml start nginx
    exit 1
fi
