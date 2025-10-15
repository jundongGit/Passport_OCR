# Passport OCR 部署总结

## 部署信息

**部署时间**: 2025-10-16
**部署状态**: ✅ 成功
**部署模式**: Docker 容器化部署 (HTTP)

## 服务器信息

- **服务器IP**: 3.27.214.148
- **用户**: ubuntu
- **操作系统**: Ubuntu 24.04.3 LTS
- **部署目录**: /srv/projects/passport_ocr

## 访问信息

### 应用访问地址

- **前端地址**: http://passport.wanguo.co.nz
- **后端API**: http://passport.wanguo.co.nz/api
- **后端健康检查**: http://passport.wanguo.co.nz/api/health

### 管理员账户

- **用户名**: admin@passport.com
- **密码**: admin123
- **重要**: 首次登录后请立即修改密码！

## 部署架构

### Docker 容器

| 容器名称 | 镜像 | 端口映射 | 状态 |
|---------|------|---------|------|
| passport-nginx | nginx:alpine | 80:80, 443:443 | Running |
| passport-backend | passport_ocr-backend | 3060:3060 | Running |
| passport-frontend | passport_ocr-frontend | - | Running |
| passport-mysql | mysql:8.0 | 3306:3306 | Running |
| passport-certbot | certbot/certbot | - | Running |

### 数据卷

- `mysql_data`: MySQL 数据持久化
- `certbot-data`: SSL 证书挑战数据
- `certbot-conf`: SSL 证书配置
- `backend/uploads`: 上传文件存储
- `backend/logs`: 应用日志

### 网络

- **网络名称**: passport-network
- **网络类型**: bridge

## 部署过程

### 1. 代码推送
- ✅ 创建生产环境 Docker 配置
- ✅ 创建 Nginx 反向代理配置
- ✅ 创建 MySQL 初始化脚本
- ✅ 推送代码到 GitHub

### 2. 服务器环境配置
- ✅ 安装 Docker (v28.5.0)
- ✅ 安装 Docker Compose (v2.23.3)
- ✅ 克隆代码仓库
- ✅ 配置环境变量

### 3. 容器构建与启动
- ✅ 构建后端镜像（Node.js + MySQL驱动）
- ✅ 构建前端镜像（React生产构建）
- ✅ 启动 MySQL 数据库
- ✅ 初始化数据库表结构
- ✅ 启动后端服务
- ✅ 启动前端服务
- ✅ 配置 Nginx 反向代理

### 4. SSL 证书（待配置）
- ⚠️ SSL 证书申请需要手动完成
- ℹ️ 当前使用 HTTP 访问
- ℹ️ 域名DNS需要确保已完全生效

## 运维命令

### 连接服务器

```bash
ssh -i /Users/jundong/Documents/FREEAI/Dev/Dev_WWH.pem ubuntu@3.27.214.148
cd /srv/projects/passport_ocr
```

### 查看服务状态

```bash
# 查看所有容器状态
docker-compose -f docker-compose.prod.yml ps

# 查看容器详细信息
docker-compose -f docker-compose.prod.yml ps --all
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f mysql
docker-compose -f docker-compose.prod.yml logs -f nginx

# 查看最近N行日志
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

### 服务管理

```bash
# 重启所有服务
docker-compose -f docker-compose.prod.yml restart

# 重启特定服务
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart nginx

# 停止所有服务
docker-compose -f docker-compose.prod.yml down

# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d
```

### 更新部署

#### 快速更新（后端代码小改动）

```bash
cd /srv/projects/passport_ocr
git pull
docker-compose -f docker-compose.prod.yml restart backend
```

或使用快速部署脚本：

```bash
cd /srv/projects/passport_ocr
./quick-deploy.sh
```

#### 完整重建（前端改动或依赖变更）

```bash
cd /srv/projects/passport_ocr
git pull
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

或使用重建脚本：

```bash
cd /srv/projects/passport_ocr
./rebuild-deploy.sh
```

### 数据库管理

```bash
# 进入 MySQL 容器
docker-compose -f docker-compose.prod.yml exec mysql bash

# 连接 MySQL
docker-compose -f docker-compose.prod.yml exec mysql mysql -uroot -p

# 备份数据库
docker-compose -f docker-compose.prod.yml exec mysql mysqldump \
    -uroot -p passport_ocr > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T mysql \
    mysql -uroot -p passport_ocr
```

## 待办事项

### 立即执行
- [ ] 首次登录并修改管理员密码
- [ ] 测试护照识别功能
- [ ] 测试游客管理功能

### 后续优化
- [ ] 配置 SSL 证书（Let's Encrypt）
  - 确认域名 DNS 已完全生效
  - 运行 SSL 配置脚本
- [ ] 配置自动备份任务
- [ ] 配置日志轮转
- [ ] 性能监控配置

## SSL 证书配置指南

### 方法一：自动配置（推荐）

等待 DNS 完全生效后（通常1-24小时），在服务器上执行：

```bash
cd /srv/projects/passport_ocr

# 停止 nginx
docker-compose -f docker-compose.prod.yml stop nginx

# 申请证书
docker run --rm -p 80:80 -p 443:443 \
    -v $(pwd)/certbot-conf:/etc/letsencrypt \
    -v $(pwd)/certbot-data:/var/www/certbot \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email admin@wanguo.co.nz \
    --agree-tos \
    --no-eff-email \
    -d passport.wanguo.co.nz

# 更新 nginx 配置为 HTTPS
cp nginx/nginx.http.conf nginx/nginx.conf.bak
# nginx.conf 已经是 HTTPS 配置，直接重启即可

# 启动 nginx
docker-compose -f docker-compose.prod.yml start nginx
```

### 方法二：手动上传证书

如果有现成的 SSL 证书，可以手动上传：

```bash
# 创建证书目录
mkdir -p /srv/projects/passport_ocr/nginx/ssl

# 上传证书文件
scp -i /Users/jundong/Documents/FREEAI/Dev/Dev_WWH.pem \
    your_certificate.crt ubuntu@3.27.214.148:/srv/projects/passport_ocr/nginx/ssl/
scp -i /Users/jundong/Documents/FREEAI/Dev/Dev_WWH.pem \
    your_private_key.key ubuntu@3.27.214.148:/srv/projects/passport_ocr/nginx/ssl/

# 更新 nginx 配置，重启服务
```

## 故障排查

### 问题：容器无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs [service-name]

# 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 重建容器
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### 问题：数据库连接失败

```bash
# 检查 MySQL 容器是否运行
docker-compose -f docker-compose.prod.yml ps mysql

# 查看 MySQL 日志
docker-compose -f docker-compose.prod.yml logs mysql

# 进入容器检查
docker-compose -f docker-compose.prod.yml exec mysql mysql -uroot -p
```

### 问题：端口被占用

```bash
# 查找占用端口的进程
sudo lsof -i :80
sudo lsof -i :3060

# 停止所有 Docker 容器
docker stop $(docker ps -q)

# 重新启动
docker-compose -f docker-compose.prod.yml up -d
```

## 安全建议

1. **立即修改默认密码**
   - 管理员密码
   - MySQL root 密码
   - JWT Secret

2. **配置防火墙**
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   ```

3. **定期备份**
   - 设置自动数据库备份
   - 备份上传文件目录

4. **监控日志**
   - 定期查看应用日志
   - 设置异常报警

## 技术栈

- **前端**: React 18, Ant Design 5
- **后端**: Node.js 18, Express
- **数据库**: MySQL 8.0
- **OCR**: Tesseract.js, OpenAI API
- **部署**: Docker, Docker Compose, Nginx
- **SSL**: Let's Encrypt (待配置)

## 相关文档

- [完整部署文档](DEPLOYMENT.md)
- [Docker说明](DOCKER_README.md)
- [系统迭代指南](SYSTEM_ITERATION_GUIDE.md)
- [宝塔部署指南](BAOTA_DEPLOYMENT_GUIDE.md)

## 联系方式

如有问题，请查看：
- GitHub仓库: https://github.com/jundongGit/Passport_OCR
- 部署日志: /srv/projects/passport_ocr/backend/logs/

---

**部署完成时间**: 2025-10-16
**部署执行人**: DevOps Agent
**下次检查**: 建议24小时后检查服务运行状况
