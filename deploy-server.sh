#!/bin/bash

# Passport OCR - 服务器端完整部署脚本
# 使用方法：chmod +x deploy-server.sh && ./deploy-server.sh

set -e

echo "=========================================="
echo "  Passport OCR - 服务器端完整部署"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="/srv/projects/passport_ocr"
GITHUB_REPO="git@github.com:jundongGit/Passport_OCR.git"
DOMAIN="passport.wanguo.co.nz"

# 检查是否为 root 用户
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}请不要使用 root 用户运行此脚本${NC}"
    exit 1
fi

# 步骤 1: 更新系统
echo -e "\n${GREEN}[1/9] 更新系统包...${NC}"
sudo apt update && sudo apt upgrade -y

# 步骤 2: 安装 Docker
echo -e "\n${GREEN}[2/9] 安装 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}Docker 已安装，请注销并重新登录以应用用户组更改${NC}"
else
    echo -e "${GREEN}Docker 已安装${NC}"
fi

# 步骤 3: 安装 Docker Compose
echo -e "\n${GREEN}[3/9] 安装 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo apt install -y docker-compose-plugin
    sudo ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose 已安装${NC}"
else
    echo -e "${GREEN}Docker Compose 已安装${NC}"
fi

# 步骤 4: 创建项目目录
echo -e "\n${GREEN}[4/9] 创建项目目录...${NC}"
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 步骤 5: 克隆或更新代码
echo -e "\n${GREEN}[5/9] 获取项目代码...${NC}"
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "项目已存在，拉取最新代码..."
    cd $PROJECT_DIR
    git pull
else
    echo "首次部署，克隆代码仓库..."
    git clone $GITHUB_REPO $PROJECT_DIR
    cd $PROJECT_DIR
fi

# 步骤 6: 配置环境变量
echo -e "\n${GREEN}[6/9] 配置环境变量...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        cp $PROJECT_DIR/.env.production $PROJECT_DIR/.env
        echo -e "${YELLOW}请编辑 .env 文件并设置正确的密码和密钥${NC}"
        echo -e "${YELLOW}按任意键继续...${NC}"
        read -n 1 -s
    else
        echo -e "${RED}.env.production 文件不存在，请先创建${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}.env 文件已存在${NC}"
fi

# 步骤 7: 创建必要的目录
echo -e "\n${GREEN}[7/9] 创建必要的目录...${NC}"
mkdir -p $PROJECT_DIR/backend/uploads
mkdir -p $PROJECT_DIR/backend/logs
mkdir -p $PROJECT_DIR/nginx/ssl

# 步骤 8: 先使用 HTTP 配置启动服务（用于 SSL 证书申请）
echo -e "\n${GREEN}[8/9] 启动服务（HTTP 模式）...${NC}"
cp $PROJECT_DIR/nginx/nginx.http.conf $PROJECT_DIR/nginx/nginx.conf

# 停止并删除旧容器
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 20

# 步骤 9: 申请 SSL 证书
echo -e "\n${GREEN}[9/9] 申请 SSL 证书...${NC}"
echo -e "${YELLOW}开始申请 Let's Encrypt SSL 证书${NC}"

# 申请证书
docker-compose -f docker-compose.prod.yml exec certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@wanguo.co.nz \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}SSL 证书申请成功${NC}"

    # 切换到 HTTPS 配置
    echo -e "\n${GREEN}切换到 HTTPS 配置...${NC}"
    # nginx.conf 已经是 HTTPS 配置，只需重启
    docker-compose -f docker-compose.prod.yml restart nginx

    echo -e "${GREEN}=========================================="
    echo -e "  部署完成！"
    echo -e "==========================================${NC}"
    echo -e "\n访问地址："
    echo -e "  前端: ${GREEN}https://$DOMAIN${NC}"
    echo -e "  后端API: ${GREEN}https://$DOMAIN/api${NC}"
    echo -e "\n管理员账户："
    echo -e "  用户名: ${GREEN}admin@passport.com${NC}"
    echo -e "  密码: ${GREEN}admin123${NC}"
    echo -e "\n常用命令："
    echo -e "  查看日志: ${YELLOW}cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml logs -f${NC}"
    echo -e "  重启服务: ${YELLOW}cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart${NC}"
    echo -e "  停止服务: ${YELLOW}cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml down${NC}"
else
    echo -e "${RED}SSL 证书申请失败，服务仍以 HTTP 模式运行${NC}"
    echo -e "访问地址: ${GREEN}http://$DOMAIN${NC}"
fi

echo -e "\n${GREEN}部署脚本执行完成！${NC}"
