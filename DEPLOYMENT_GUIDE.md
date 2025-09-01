# 护照OCR旅游管理系统 - 服务器部署指南

## 目录
1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [项目部署](#项目部署)
4. [配置说明](#配置说明)
5. [启动服务](#启动服务)
6. [Nginx配置](#nginx配置)
7. [SSL证书配置](#ssl证书配置)
8. [系统维护](#系统维护)
9. [故障排查](#故障排查)

## 系统要求

### 硬件要求
- CPU: 2核心以上
- 内存: 4GB以上（推荐8GB）
- 硬盘: 50GB以上可用空间
- 带宽: 10Mbps以上

### 软件要求
- 操作系统: Ubuntu 20.04 LTS 或 CentOS 7+
- Node.js: v16.0.0 或更高版本
- MongoDB: v4.4 或更高版本
- Nginx: v1.18.0 或更高版本
- PM2: 最新版本（进程管理）

## 环境准备

### 1. 更新系统包
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. 安装Node.js
```bash
# 使用NodeSource仓库安装Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 3. 安装MongoDB
```bash
# Ubuntu 20.04
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 4. 安装Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. 安装PM2
```bash
sudo npm install -g pm2
pm2 startup systemd
```

### 6. 安装必要工具
```bash
sudo apt install git curl wget build-essential -y
```

## 项目部署

### 1. 创建应用目录
```bash
sudo mkdir -p /var/www/passport-ocr
sudo chown -R $USER:$USER /var/www/passport-ocr
cd /var/www/passport-ocr
```

### 2. 克隆项目代码
```bash
# 如果使用Git
git clone <你的项目仓库地址> .

# 或者上传项目文件
# 使用 scp, rsync 或其他方式上传项目文件
```

### 3. 安装后端依赖
```bash
cd /var/www/passport-ocr/backend
npm install --production

# 创建上传目录
mkdir -p uploads
mkdir -p logs
chmod 755 uploads logs
```

### 4. 安装前端依赖并构建
```bash
cd /var/www/passport-ocr/frontend
npm install
npm run build
```

## 配置说明

### 1. 后端环境配置
创建 `/var/www/passport-ocr/backend/.env` 文件：

```env
# 服务器配置
PORT=3060
NODE_ENV=production

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/passport_ocr_db

# JWT密钥（请更改为随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI API配置
OPENAI_API_KEY=your-openai-api-key

# 邮件服务配置
SMTP_HOST=smtp.zoho.com.au
SMTP_PORT=587
SMTP_USER=verify@wanguo.co.nz
SMTP_PASS=$cUvX2d#

# 前端URL（用于CORS和邮件链接）
FRONTEND_URL=https://your-domain.com

# 上传配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# 日志配置
LOG_LEVEL=info
LOG_DIR=logs
```

### 2. 前端环境配置
创建 `/var/www/passport-ocr/frontend/.env.production` 文件：

```env
# API接口地址
REACT_APP_API_URL=https://your-domain.com/api

# 其他配置
REACT_APP_TITLE=护照OCR旅游管理系统
```

### 3. PM2配置文件
创建 `/var/www/passport-ocr/ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'passport-ocr-backend',
      script: './backend/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3060
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      watch: false,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

## 启动服务

### 1. 初始化数据库
```bash
cd /var/www/passport-ocr/backend

# 创建管理员账号（如果有初始化脚本）
node scripts/init-admin.js

# 或通过API创建
curl -X POST http://localhost:3060/api/auth/create-admin
```

### 2. 使用PM2启动后端
```bash
cd /var/www/passport-ocr
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. PM2常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs passport-ocr-backend

# 重启应用
pm2 restart passport-ocr-backend

# 停止应用
pm2 stop passport-ocr-backend

# 监控
pm2 monit
```

## Nginx配置

### 1. 创建Nginx配置文件
创建 `/etc/nginx/sites-available/passport-ocr`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/your-domain.com.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.com.key;
    
    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # 日志
    access_log /var/log/nginx/passport-ocr-access.log;
    error_log /var/log/nginx/passport-ocr-error.log;

    # 前端静态文件
    location / {
        root /var/www/passport-ocr/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 文件上传大小限制
        client_max_body_size 10M;
    }

    # 上传的文件访问
    location /uploads {
        alias /var/www/passport-ocr/backend/uploads;
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

### 2. 启用配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/passport-ocr /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重新加载Nginx
sudo systemctl reload nginx
```

## SSL证书配置

### 使用Let's Encrypt免费证书
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run

# 添加定时任务自动续期
sudo crontab -e
# 添加以下行
0 3 * * * /usr/bin/certbot renew --quiet
```

## 系统维护

### 1. 数据库备份
创建备份脚本 `/var/www/passport-ocr/scripts/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/passport-ocr"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="passport_ocr_db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mongodump --db $DB_NAME --out $BACKUP_DIR/db_$DATE

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/passport-ocr/backend/uploads

# 删除7天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

### 2. 设置定时备份
```bash
# 添加定时任务
crontab -e
# 每天凌晨2点备份
0 2 * * * /var/www/passport-ocr/scripts/backup.sh >> /var/log/passport-ocr-backup.log 2>&1
```

### 3. 日志管理
创建日志轮转配置 `/etc/logrotate.d/passport-ocr`：

```
/var/www/passport-ocr/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 4. 监控设置
```bash
# 安装监控工具
sudo apt install htop iotop nethogs -y

# 使用PM2监控
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 故障排查

### 1. 常见问题检查清单
```bash
# 检查服务状态
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# 检查端口占用
sudo netstat -tulpn | grep -E '(80|443|3060|27017)'

# 检查日志
pm2 logs passport-ocr-backend --lines 100
sudo tail -f /var/log/nginx/passport-ocr-error.log
sudo journalctl -u mongod -f

# 检查磁盘空间
df -h

# 检查内存使用
free -m

# 检查进程
ps aux | grep -E '(node|mongo|nginx)'
```

### 2. 问题解决方案

#### MongoDB连接失败
```bash
# 检查MongoDB服务
sudo systemctl status mongod
# 重启MongoDB
sudo systemctl restart mongod
# 检查MongoDB日志
sudo tail -n 100 /var/log/mongodb/mongod.log
```

#### 文件上传失败
```bash
# 检查目录权限
ls -la /var/www/passport-ocr/backend/uploads
# 修复权限
sudo chown -R www-data:www-data /var/www/passport-ocr/backend/uploads
sudo chmod 755 /var/www/passport-ocr/backend/uploads
```

#### API响应慢
```bash
# 检查PM2进程
pm2 monit
# 重启应用
pm2 restart passport-ocr-backend
# 增加实例数
pm2 scale passport-ocr-backend 4
```

### 3. 性能优化建议

1. **启用Nginx缓存**
```nginx
# 在http块中添加
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;

# 在location /api块中添加
proxy_cache api_cache;
proxy_cache_valid 200 302 10m;
proxy_cache_valid 404 1m;
```

2. **MongoDB索引优化**
```javascript
// 连接MongoDB并创建索引
use passport_ocr_db
db.tourists.createIndex({ "uploadLink": 1 })
db.tourists.createIndex({ "tourId": 1, "ekok": 1 })
db.tourists.createIndex({ "salesName": 1 })
db.tours.createIndex({ "departureDate": -1 })
```

3. **启用Gzip压缩**
```nginx
# 在http块中添加
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;
```

## 安全建议

1. **防火墙配置**
```bash
# 安装UFW
sudo apt install ufw -y

# 配置防火墙规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

2. **定期更新**
```bash
# 创建更新脚本
#!/bin/bash
apt update && apt upgrade -y
npm update -g
pm2 update
```

3. **访问控制**
- 限制MongoDB只能本地访问
- 使用强密码
- 定期更换JWT密钥
- 启用HTTPS
- 配置CORS白名单

## 联系支持

如遇到问题，请查看：
- 项目文档: `/var/www/passport-ocr/README.md`
- 日志文件: `/var/www/passport-ocr/logs/`
- PM2监控: `pm2 monit`

---

最后更新: 2024年8月
版本: 1.0.0