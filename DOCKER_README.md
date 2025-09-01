# Docker 部署指南

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- OpenAI API Key

## 快速启动

### 1. 克隆项目
```bash
git clone <repository-url>
cd Passport_OCR
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加你的 OpenAI API Key
vim .env
```

### 3. 启动所有服务
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 4. 访问应用
- 前端应用: http://localhost:3000
- 后端API: http://localhost:3060
- MongoDB: localhost:27017

## 服务说明

### MongoDB
- **端口**: 27017
- **数据库**: passport_ocr
- **数据持久化**: mongodb_data volume

### Backend
- **端口**: 3060
- **技术栈**: Node.js + Express
- **数据目录**: 
  - `./backend/uploads` - 上传文件
  - `./backend/logs` - 应用日志

### Frontend
- **端口**: 3000 (映射到容器内的80端口)
- **技术栈**: React + Nginx
- **反向代理**: API请求自动转发到后端

## 常用命令

### 启动/停止服务
```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除volumes
docker-compose down -v

# 重启特定服务
docker-compose restart backend
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### 数据管理
```bash
# 备份MongoDB数据
docker exec passport-mongodb mongodump --db passport_ocr --out /backup

# 恢复MongoDB数据
docker exec passport-mongodb mongorestore --db passport_ocr /backup/passport_ocr
```

### 开发模式
```bash
# 重新构建服务
docker-compose build

# 强制重新构建
docker-compose build --no-cache

# 进入容器调试
docker exec -it passport-backend sh
docker exec -it passport-frontend sh
```

## 生产环境配置

### 1. 环境变量优化
创建 `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    environment:
      - NODE_ENV=production
      - JWT_SECRET=your_strong_jwt_secret_here
    restart: always

  frontend:
    restart: always

  mongodb:
    restart: always
    command: mongod --auth
```

### 2. 使用生产配置启动
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. 反向代理 (推荐使用 Traefik 或 Nginx Proxy Manager)
```yaml
# 添加到 docker-compose.yml
  nginx-proxy:
    image: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

## 故障排除

### 常见问题

1. **MongoDB 连接失败**
```bash
# 检查 MongoDB 容器状态
docker-compose logs mongodb

# 重启 MongoDB
docker-compose restart mongodb
```

2. **后端服务启动失败**
```bash
# 检查后端日志
docker-compose logs backend

# 进入容器调试
docker exec -it passport-backend sh
npm start
```

3. **前端无法访问后端API**
- 检查 nginx.conf 配置是否正确
- 确认后端服务运行正常
- 检查网络连接：`docker network ls`

4. **上传文件丢失**
- 确认 volumes 映射正确
- 检查目录权限：`ls -la backend/uploads`

### 性能优化

1. **限制资源使用**
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

2. **使用多阶段构建优化镜像大小**
- 已在 Dockerfile 中实现
- Frontend 使用 nginx:alpine 减少镜像大小

3. **数据库索引优化**
```javascript
// 进入 MongoDB 容器执行
db.tourists.createIndex({"uploadLink": 1})
db.tours.createIndex({"createdAt": -1})
```

## 监控和日志

### 日志收集
推荐使用 ELK Stack 或 Grafana + Loki:
```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

### 健康检查
```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3060/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 安全建议

1. **环境变量安全**
   - 不要将 `.env` 文件提交到版本控制
   - 使用强密码和密钥
   - 定期轮换 API Keys

2. **网络安全**
   - 使用防火墙限制端口访问
   - 配置 SSL/TLS 证书
   - 定期更新镜像和依赖

3. **数据安全**
   - 定期备份数据库
   - 加密敏感数据
   - 限制文件上传大小和类型