# 护照识别系统宝塔部署指南

## 📋 部署概览

本指南将帮助您在宝塔面板中部署护照识别系统，域名为 `passport.wanguo.co.nz`

## 🛠 环境准备

### 1.1 宝塔面板软件安装

在宝塔面板中安装以下软件：

- **Node.js** 18+
- **MySQL** 5.7+
- **Nginx** 最新版
- **PM2管理器** 2.x+

### 1.2 系统要求

- **服务器配置**: 最低2核4G内存，推荐4核8G
- **存储空间**: 至少20GB可用空间
- **操作系统**: CentOS 7+ / Ubuntu 18.04+

## 🗄️ 数据库配置

### 2.1 创建MySQL数据库

在宝塔数据库管理中创建：

```text
数据库名: passport_ocr
用户名: passport_user  
密码: [设置强密码，建议16位以上]
编码: utf8mb4
```

### 2.2 数据库安全设置

- 禁用root用户远程登录
- 设置复杂密码
- 启用慢查询日志
- 定期备份数据

## 🌐 域名和SSL配置

### 3.1 添加网站

在宝塔面板中：

1. **网站** → **添加站点**
2. **域名**: `passport.wanguo.co.nz`
3. **根目录**: `/www/wwwroot/passport.wanguo.co.nz`
4. **PHP版本**: 纯静态（不选择PHP）

### 3.2 SSL证书配置

1. 进入网站设置 → **SSL**
2. 选择 **Let's Encrypt** 免费证书
3. 申请证书并开启
4. 勾选 **强制HTTPS**

## 📁 项目部署

### 4.1 上传项目文件

将项目文件上传到网站根目录：

```
/www/wwwroot/passport.wanguo.co.nz/
├── backend/                    # 后端代码
├── frontend/                   # 前端代码
├── uploads/                    # 上传文件目录
├── logs/                       # 日志目录
├── docker-compose.yml
├── start.sh
├── DEPLOYMENT_GUIDE.md
├── BAOTA_DEPLOYMENT_GUIDE.md
└── README.md
```

### 4.2 创建必要目录

```bash
mkdir -p /www/wwwroot/passport.wanguo.co.nz/uploads
mkdir -p /www/wwwroot/passport.wanguo.co.nz/logs
```

## ⚙️ 后端部署

### 5.1 环境变量配置

创建 `backend/.env` 文件：

```env
# 服务配置
PORT=3060
NODE_ENV=production

# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=passport_ocr
DB_USER=passport_user
DB_PASSWORD=你的数据库密码

# 安全配置
JWT_SECRET=你的JWT密钥_至少32位随机字符串
OPENAI_API_KEY=你的OpenAI密钥

# 文件配置
UPLOAD_DIR=/www/wwwroot/passport.wanguo.co.nz/uploads
FRONTEND_URL=https://passport.wanguo.co.nz

# 邮件配置（可选）
SMTP_HOST=smtp.your-domain.com
SMTP_PORT=587
SMTP_USER=noreply@wanguo.co.nz
SMTP_PASS=邮箱密码
```

### 5.2 安装依赖

```bash
cd /www/wwwroot/passport.wanguo.co.nz/backend
npm install --production
```

### 5.3 初始化数据库

```bash
node scripts/syncDatabase.js
```

### 5.4 PM2配置

创建 `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'passport-backend',
    script: 'server.js',
    cwd: '/www/wwwroot/passport.wanguo.co.nz/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3060
    },
    log_file: '/www/wwwroot/passport.wanguo.co.nz/logs/combined.log',
    out_file: '/www/wwwroot/passport.wanguo.co.nz/logs/out.log',
    error_file: '/www/wwwroot/passport.wanguo.co.nz/logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '1G',
    restart_delay: 4000,
    watch: false,
    ignore_watch: ['node_modules', 'uploads', 'logs']
  }]
}
```

### 5.5 启动后端服务

```bash
cd /www/wwwroot/passport.wanguo.co.nz/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🎨 前端部署

### 6.1 安装依赖并构建

```bash
cd /www/wwwroot/passport.wanguo.co.nz/frontend
npm install
npm run build
```

### 6.2 前端环境配置

如果需要，可以创建 `frontend/.env.production`:

```env
REACT_APP_API_URL=https://passport.wanguo.co.nz/api
REACT_APP_UPLOAD_URL=https://passport.wanguo.co.nz/uploads
```

## 🔧 Nginx配置

### 7.1 网站配置

在宝塔面板中，进入网站设置 → 配置文件，添加以下配置：

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name passport.wanguo.co.nz;
    
    # SSL配置（宝塔自动生成）
    # ssl_certificate ...
    # ssl_certificate_key ...
    
    # 网站根目录
    root /www/wwwroot/passport.wanguo.co.nz/frontend/build;
    index index.html;
    
    # 安全头配置
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 前端路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://127.0.0.1:3060;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 文件上传大小限制
        client_max_body_size 10M;
    }
    
    # 上传文件目录
    location /uploads/ {
        alias /www/wwwroot/passport.wanguo.co.nz/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        
        # 安全限制
        location ~* \.(php|php5|asp|aspx|jsp|py|pl|cgi)$ {
            deny all;
        }
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 禁止访问敏感文件
    location ~ /\.(ht|env|git) {
        deny all;
    }
    
    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    
    # 访问日志
    access_log /www/wwwroot/passport.wanguo.co.nz/logs/access.log;
    error_log /www/wwwroot/passport.wanguo.co.nz/logs/error.log;
}

# HTTP重定向到HTTPS
server {
    listen 80;
    server_name passport.wanguo.co.nz;
    return 301 https://$server_name$request_uri;
}
```

## 🔒 安全配置

### 8.1 文件权限设置

```bash
# 设置正确的文件权限
chown -R www:www /www/wwwroot/passport.wanguo.co.nz
chmod -R 755 /www/wwwroot/passport.wanguo.co.nz
chmod -R 777 /www/wwwroot/passport.wanguo.co.nz/uploads
chmod -R 755 /www/wwwroot/passport.wanguo.co.nz/logs
```

### 8.2 防火墙配置

在宝塔安全面板中：

**开放端口：**

- 80 (HTTP)
- 443 (HTTPS)
- 22 (SSH，限制IP访问)

**禁止端口：**

- 3060 (后端API，仅内网访问)
- 3306 (MySQL，仅本机访问)

### 8.3 宝塔安全设置

1. **面板设置** → 修改默认端口
2. **面板设置** → 绑定域名访问
3. **面板设置** → 开启BasicAuth
4. **安全** → 开启SSH防暴力破解
5. **安全** → 开启面板SSL

## 🚀 自动部署脚本

### 9.1 创建部署脚本

创建 `deploy.sh`:

```bash
#!/bin/bash

# 部署配置
PROJECT_DIR="/www/wwwroot/passport.wanguo.co.nz"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🚀 开始部署护照识别系统..."
echo "时间: $(date)"

# 检查目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    exit 1
fi

# 进入项目目录
cd $PROJECT_DIR

# 备份当前版本（可选）
echo "📦 备份当前版本..."
tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" backend frontend --exclude=node_modules --exclude=build 2>/dev/null || true

# 更新代码（如果使用Git）
if [ -d ".git" ]; then
    echo "📥 更新代码..."
    git pull origin main
fi

# 停止后端服务
echo "⏸️  停止后端服务..."
pm2 stop passport-backend

# 更新后端依赖
echo "📦 更新后端依赖..."
cd $BACKEND_DIR
npm install --production

# 数据库迁移
echo "🗄️  执行数据库迁移..."
node scripts/syncDatabase.js

# 构建前端
echo "🎨 构建前端..."
cd $FRONTEND_DIR
npm install
npm run build

# 重启后端服务
echo "🔄 重启后端服务..."
pm2 restart passport-backend

# 检查服务状态
echo "✅ 检查服务状态..."
pm2 status passport-backend

# 重载Nginx
echo "🔄 重载Nginx..."
nginx -t && nginx -s reload

# 清理旧备份（保留最近5个）
echo "🧹 清理旧备份文件..."
cd $PROJECT_DIR
ls -t backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

echo "✅ 部署完成！"
echo "🌐 网站地址: https://passport.wanguo.co.nz"
echo "🔧 管理后台: https://passport.wanguo.co.nz/admin"
echo "📊 服务状态: pm2 status"
echo "📝 查看日志: pm2 logs passport-backend"
```

### 9.2 设置执行权限

```bash
chmod +x deploy.sh
```

### 9.3 使用部署脚本

```bash
# 执行部署
./deploy.sh

# 查看部署日志
./deploy.sh 2>&1 | tee deploy.log
```

## 📊 监控和日志

### 10.1 PM2监控

```bash
# 查看服务状态
pm2 status

# 查看实时日志
pm2 logs passport-backend

# 查看服务详情
pm2 show passport-backend

# 重启服务
pm2 restart passport-backend

# 查看进程监控
pm2 monit
```

### 10.2 日志管理

**日志文件位置：**
- PM2日志: `/www/wwwroot/passport.wanguo.co.nz/logs/`
- Nginx访问日志: `/www/wwwroot/passport.wanguo.co.nz/logs/access.log`
- Nginx错误日志: `/www/wwwroot/passport.wanguo.co.nz/logs/error.log`

**日志轮转配置（在宝塔面板中设置）：**

```bash
# 创建logrotate配置
/www/wwwroot/passport.wanguo.co.nz/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

### 10.3 宝塔监控设置

在宝塔面板中设置：

1. **监控** → **网站监控** → 添加监控
   - 监控地址: `https://passport.wanguo.co.nz`
   - 检查间隔: 5分钟
   - 超时时间: 30秒

2. **监控** → **服务器监控**
   - CPU使用率 > 80%
   - 内存使用率 > 85%
   - 磁盘使用率 > 80%

3. **通知设置**
   - 邮箱通知
   - 微信通知（可选）

## 🔄 备份策略

### 11.1 数据库备份

在宝塔面板中设置自动备份：

1. **数据库** → **备份** → **自动备份**
2. 备份周期: 每日凌晨2点
3. 保存份数: 7份
4. 压缩备份: 开启

### 11.2 网站文件备份

1. **文件** → **备份** → **计划任务**
2. 任务类型: 备份网站
3. 执行周期: 每周
4. 备份到: 本地 + 云存储

### 11.3 手动备份命令

```bash
# 备份数据库
mysqldump -u passport_user -p passport_ocr > backup_$(date +%Y%m%d).sql

# 备份网站文件
tar -czf website_backup_$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=build \
    /www/wwwroot/passport.wanguo.co.nz/
```

## ⚡ 性能优化

### 12.1 宝塔优化设置

1. **网站设置** → **性能优化**
   - 开启Gzip压缩
   - 开启静态文件缓存
   - 开启浏览器缓存

2. **PHP优化**（如需要）
   - 调整PHP内存限制
   - 开启OPcache

3. **MySQL优化**
   - 调整缓冲区大小
   - 开启慢查询日志
   - 定期优化表

### 12.2 Nginx优化

在网站配置中添加：

```nginx
# Gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 缓冲区设置
client_body_buffer_size 10K;
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;

# 连接优化
keepalive_timeout 15;
keepalive_requests 100;
```

### 12.3 Node.js优化

在 `ecosystem.config.js` 中：

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3060,
  UV_THREADPOOL_SIZE: 4,
  NODE_OPTIONS: '--max-old-space-size=1024'
}
```

## 🔧 常见问题解决

### 13.1 服务无法启动

```bash
# 检查端口占用
netstat -tlnp | grep 3060

# 检查PM2状态
pm2 status

# 查看错误日志
pm2 logs passport-backend --err

# 手动启动测试
cd /www/wwwroot/passport.wanguo.co.nz/backend
node server.js
```

### 13.2 数据库连接失败

```bash
# 检查MySQL服务
systemctl status mysql

# 测试数据库连接
mysql -u passport_user -p -e "USE passport_ocr; SHOW TABLES;"

# 检查数据库配置
cat backend/.env | grep DB_
```

### 13.3 前端访问404

```bash
# 检查构建文件
ls -la /www/wwwroot/passport.wanguo.co.nz/frontend/build/

# 重新构建
cd /www/wwwroot/passport.wanguo.co.nz/frontend
npm run build

# 检查Nginx配置
nginx -t
```

### 13.4 文件上传失败

```bash
# 检查上传目录权限
ls -la /www/wwwroot/passport.wanguo.co.nz/uploads/

# 修复权限
chmod 777 /www/wwwroot/passport.wanguo.co.nz/uploads/
chown www:www /www/wwwroot/passport.wanguo.co.nz/uploads/
```

## 📞 访问信息

### 14.1 系统访问地址

- **前端首页**: <https://passport.wanguo.co.nz>
- **管理后台**: <https://passport.wanguo.co.nz/admin>
- **API文档**: <https://passport.wanguo.co.nz/api/health>

### 14.2 默认账号信息

**管理员账号：**

- 邮箱: `admin@passport.com`
- 密码: `admin123456`
- 角色: 系统管理员

> ⚠️ **安全提醒**: 部署完成后请立即修改默认管理员密码！

### 14.3 技术支持

如遇到问题，请检查以下日志：

- PM2日志: `pm2 logs passport-backend`
- Nginx日志: `/www/wwwroot/passport.wanguo.co.nz/logs/error.log`
- 系统日志: `/var/log/messages`

---

## ✅ 部署检查清单

部署完成后，请逐一检查以下项目：

- [ ] MySQL数据库已创建并可正常连接
- [ ] SSL证书已申请并开启HTTPS
- [ ] 后端服务已启动（PM2状态正常）
- [ ] 前端已成功构建并部署
- [ ] Nginx配置正确，API代理正常
- [ ] 文件上传目录权限正确
- [ ] 管理员账号可正常登录
- [ ] 监控和备份策略已设置
- [ ] 防火墙和安全配置已完成
- [ ] 域名解析正确，网站可正常访问

🎉 **恭喜！护照识别系统已成功部署到宝塔环境！**