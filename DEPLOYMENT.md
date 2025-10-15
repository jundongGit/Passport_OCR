# Passport OCR - 生产环境部署文档

## 项目信息

- **项目名称**: Passport OCR（护照识别系统）
- **域名**: passport.wanguo.co.nz
- **服务器**: 3.27.214.148 (ubuntu用户)
- **GitHub仓库**: git@github.com:jundongGit/Passport_OCR.git
- **部署目录**: /srv/projects/passport_ocr

## 架构说明

本项目采用 Docker 容器化部署，包含以下组件：

1. **MySQL 8.0**: 数据库服务（端口 3306）
2. **Backend**: Node.js 后端服务（端口 3060）
3. **Frontend**: React 前端（Nginx 托管）
4. **Nginx**: 反向代理和 SSL 终端（端口 80/443）
5. **Certbot**: Let's Encrypt SSL 证书自动续期

## 前置要求

### 服务器要求
- Ubuntu 20.04 或更高版本
- 至少 2GB RAM
- 至少 20GB 磁盘空间
- SSH 访问权限

### 本地环境
- Git
- SSH 密钥配置（用于 GitHub 和服务器访问）

### DNS 配置
- 域名 passport.wanguo.co.nz 已解析到服务器 IP 3.27.214.148

## 部署流程

### 方式一：首次完整部署（推荐）

#### 步骤 1: 本地准备

1. 确认所有配置文件已更新：
   ```bash
   cd /Users/jundong/Documents/FREEAI/Dev/Passport_OCR

   # 检查环境变量配置
   cat .env.production

   # 检查 Docker Compose 配置
   cat docker-compose.prod.yml
   ```

2. 提交并推送代码到 GitHub：
   ```bash
   git add .
   git commit -m "生产环境部署配置"
   git push origin main
   ```

#### 步骤 2: 连接服务器

使用 SSH 密钥连接到服务器：
```bash
ssh -i /Users/jundong/Documents/FREEAI/Dev/Dev_WWH.pem ubuntu@3.27.214.148
```

#### 步骤 3: 上传并执行部署脚本

1. 从本地上传部署脚本到服务器：
   ```bash
   scp -i /Users/jundong/Documents/FREEAI/Dev/Dev_WWH.pem \
       /Users/jundong/Documents/FREEAI/Dev/Passport_OCR/deploy-server.sh \
       ubuntu@3.27.214.148:~/
   ```

2. 在服务器上执行部署脚本：
   ```bash
   chmod +x ~/deploy-server.sh
   ./deploy-server.sh
   ```

3. 部署脚本会自动完成：
   - 系统更新
   - Docker 和 Docker Compose 安装
   - 项目克隆
   - 环境变量配置
   - 服务启动
   - SSL 证书申请

#### 步骤 4: 验证部署

1. 检查所有容器状态：
   ```bash
   cd /srv/projects/passport_ocr
   docker-compose -f docker-compose.prod.yml ps
   ```

2. 查看服务日志：
   ```bash
   # 查看所有服务日志
   docker-compose -f docker-compose.prod.yml logs -f

   # 查看后端日志
   docker-compose -f docker-compose.prod.yml logs -f backend

   # 查看数据库日志
   docker-compose -f docker-compose.prod.yml logs -f mysql
   ```

3. 访问应用：
   - 前端: https://passport.wanguo.co.nz
   - 后端API: https://passport.wanguo.co.nz/api

4. 使用管理员账户登录：
   - 用户名: admin@passport.com
   - 密码: admin123

### 方式二：手动部署

如果自动脚本失败，可以手动执行以下步骤：

#### 1. 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin
```

#### 2. 克隆项目

```bash
# 创建项目目录
sudo mkdir -p /srv/projects
sudo chown -R $USER:$USER /srv/projects

# 克隆代码
git clone git@github.com:jundongGit/Passport_OCR.git /srv/projects/passport_ocr
cd /srv/projects/passport_ocr
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 编辑环境变量（修改密码和密钥）
nano .env
```

#### 4. 启动服务（HTTP 模式）

```bash
# 创建必要目录
mkdir -p backend/uploads backend/logs nginx/ssl

# 使用 HTTP 配置
cp nginx/nginx.http.conf nginx/nginx.conf

# 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
sleep 20
```

#### 5. 申请 SSL 证书

```bash
# 申请证书
docker-compose -f docker-compose.prod.yml exec certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@wanguo.co.nz \
    --agree-tos \
    --no-eff-email \
    -d passport.wanguo.co.nz
```

#### 6. 切换到 HTTPS

```bash
# 证书申请成功后，nginx.conf 已经配置了 HTTPS
# 只需重启 Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## 更新部署

### 快速更新（后端代码小改动）

适用于：后端代码小修改，不涉及依赖变更

```bash
cd /srv/projects/passport_ocr
./quick-deploy.sh
```

或手动执行：
```bash
cd /srv/projects/passport_ocr
git pull
docker-compose -f docker-compose.prod.yml restart backend
```

### 完整重建（前端改动或依赖变更）

适用于：
- 前端代码变更
- package.json 依赖变更
- Dockerfile 变更

```bash
cd /srv/projects/passport_ocr
./rebuild-deploy.sh
```

或手动执行：
```bash
cd /srv/projects/passport_ocr
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

## 常用运维命令

### 容器管理

```bash
# 查看所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart nginx

# 重建并启动服务
docker-compose -f docker-compose.prod.yml up -d --build
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f mysql
docker-compose -f docker-compose.prod.yml logs -f nginx

# 查看最近 100 行日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 数据库管理

```bash
# 进入 MySQL 容器
docker-compose -f docker-compose.prod.yml exec mysql bash

# 直接连接 MySQL
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p

# 备份数据库
docker-compose -f docker-compose.prod.yml exec mysql mysqldump \
    -u root -p passport_ocr > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker-compose -f docker-compose.prod.yml exec -T mysql mysql \
    -u root -p passport_ocr < backup.sql
```

### SSL 证书管理

```bash
# 手动续期证书
docker-compose -f docker-compose.prod.yml exec certbot certbot renew

# 强制续期
docker-compose -f docker-compose.prod.yml exec certbot certbot renew --force-renewal

# 查看证书信息
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates
```

### 清理资源

```bash
# 清理未使用的 Docker 镜像
docker image prune -a

# 清理未使用的卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a --volumes
```

## 监控和健康检查

### 服务健康检查

```bash
# 检查后端 API 健康状态
curl https://passport.wanguo.co.nz/api/health

# 检查容器健康状态
docker-compose -f docker-compose.prod.yml ps
```

### 资源监控

```bash
# 查看容器资源使用情况
docker stats

# 查看磁盘使用
df -h

# 查看 Docker 磁盘使用
docker system df
```

## 故障排查

### 问题 1: 容器启动失败

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs backend

# 检查环境变量
docker-compose -f docker-compose.prod.yml config

# 重建容器
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### 问题 2: 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker-compose -f docker-compose.prod.yml ps mysql

# 查看 MySQL 日志
docker-compose -f docker-compose.prod.yml logs mysql

# 进入 MySQL 容器检查
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p
```

### 问题 3: SSL 证书问题

```bash
# 检查证书状态
docker-compose -f docker-compose.prod.yml exec certbot certbot certificates

# 重新申请证书
docker-compose -f docker-compose.prod.yml exec certbot certbot delete -d passport.wanguo.co.nz
docker-compose -f docker-compose.prod.yml exec certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d passport.wanguo.co.nz
```

### 问题 4: Nginx 配置错误

```bash
# 测试 Nginx 配置
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# 重新加载 Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 备份策略

### 数据库备份

建议使用 cron 定时备份：

```bash
# 创建备份脚本
cat > /srv/projects/passport_ocr/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/srv/backups/passport_ocr"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

cd /srv/projects/passport_ocr

# 备份数据库
docker-compose -f docker-compose.prod.yml exec -T mysql mysqldump \
    -u root -p${MYSQL_ROOT_PASSWORD} passport_ocr > $BACKUP_DIR/db_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads/

# 删除 7 天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /srv/projects/passport_ocr/backup.sh

# 添加到 crontab（每天凌晨 2 点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /srv/projects/passport_ocr/backup.sh") | crontab -
```

## 安全建议

1. **修改默认密码**：首次部署后立即修改管理员密码
2. **环境变量**：确保 .env 文件不提交到 Git
3. **防火墙**：配置 UFW 只开放必要端口（80, 443）
4. **SSL 证书**：确保证书自动续期正常工作
5. **定期备份**：配置自动备份任务
6. **日志轮转**：配置日志轮转避免磁盘占满

## 性能优化

1. **Docker 资源限制**：在 docker-compose.prod.yml 中设置资源限制
2. **Nginx 缓存**：优化静态资源缓存策略
3. **数据库优化**：根据实际使用调整 MySQL 配置
4. **定期清理**：清理 Docker 未使用资源

## 技术支持

如遇到问题，请查看：
- 日志文件: /srv/projects/passport_ocr/backend/logs/
- 容器日志: docker-compose logs
- GitHub Issues: https://github.com/jundongGit/Passport_OCR/issues

---

**最后更新**: 2025-10-16
**版本**: 1.0.0
