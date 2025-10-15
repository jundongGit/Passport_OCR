#!/bin/bash

# 安全部署脚本 - 确保数据库不被破坏
PROJECT_DIR="/Users/jundong/Documents/FREEAI/Dev/Passport_OCR"
BACKUP_DIR="$PROJECT_DIR/backups/$(date +%Y%m%d_%H%M%S)"

echo "🛡️  开始安全部署流程..."
echo "时间: $(date)"

# 1. 创建备份目录
mkdir -p $BACKUP_DIR

# 2. 备份数据库
echo "📦 备份数据库..."
if command -v mysqldump &> /dev/null; then
    mysqldump -u root passport_ocr > $BACKUP_DIR/database_backup.sql
    echo "✅ 数据库备份完成: $BACKUP_DIR/database_backup.sql"
else
    echo "⚠️  未找到mysqldump，跳过数据库备份"
fi

# 3. 备份代码
echo "📦 备份代码..."
tar -czf $BACKUP_DIR/code_backup.tar.gz \
    --exclude=node_modules \
    --exclude=build \
    --exclude=uploads \
    --exclude=logs \
    --exclude=backups \
    backend frontend

echo "✅ 代码备份完成: $BACKUP_DIR/code_backup.tar.gz"

# 4. 停止后端服务（如果在运行）
echo "⏸️  停止后端服务..."
if command -v pm2 &> /dev/null; then
    pm2 stop passport-backend 2>/dev/null || true
else
    # 如果使用nodemon开发模式，尝试停止
    pkill -f "nodemon.*server.js" 2>/dev/null || true
fi

# 5. 安装后端依赖
echo "📦 更新后端依赖..."
cd $PROJECT_DIR/backend
npm install --production

# 6. 数据库迁移检查
echo "🔍 检查数据库迁移..."
if [ -d "migrations" ] && [ "$(ls -A migrations)" ]; then
    echo "发现迁移文件，执行数据库迁移..."
    
    # 测试迁移（干运行）
    echo "🧪 测试迁移..."
    npm run db:migrate 2>&1 | tee $BACKUP_DIR/migration.log
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库迁移成功"
    else
        echo "❌ 数据库迁移失败，开始回滚..."
        if [ -f "$BACKUP_DIR/database_backup.sql" ]; then
            mysql -u root passport_ocr < $BACKUP_DIR/database_backup.sql
            echo "✅ 数据库已回滚"
        fi
        exit 1
    fi
else
    echo "ℹ️  没有发现迁移文件，跳过数据库迁移"
fi

# 7. 构建前端
echo "🎨 构建前端..."
cd $PROJECT_DIR/frontend
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

# 8. 健康检查
echo "🔍 执行健康检查..."
cd $PROJECT_DIR/backend

# 启动服务进行测试
timeout 30 node server.js &
SERVER_PID=$!
sleep 5

# 检查API健康状态
if curl -f http://localhost:3060/api/health >/dev/null 2>&1; then
    echo "✅ 健康检查通过"
    kill $SERVER_PID 2>/dev/null || true
else
    echo "❌ 健康检查失败"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# 9. 重启服务
echo "🔄 重启服务..."
if command -v pm2 &> /dev/null; then
    pm2 start ecosystem.config.js 2>/dev/null || pm2 restart passport-backend
    echo "✅ PM2服务已重启"
else
    echo "ℹ️  开发模式：请手动启动服务 'npm run dev'"
fi

# 10. 清理旧备份（保留最近5个）
echo "🧹 清理旧备份..."
cd $PROJECT_DIR/backups
ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true

echo ""
echo "🎉 安全部署完成！"
echo "📁 备份位置: $BACKUP_DIR"
echo "🌐 前端地址: http://localhost:6066"
echo "🔧 后端地址: http://localhost:3060"
echo "📊 管理后台: http://localhost:6066/admin"
echo ""
echo "📋 部署后检查："
echo "  - 访问前端页面确认正常"
echo "  - 登录管理后台测试功能"
echo "  - 检查关键业务流程"
echo ""
echo "如遇问题，可使用以下命令回滚："
echo "  mysql -u root passport_ocr < $BACKUP_DIR/database_backup.sql"