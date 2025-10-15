# 护照识别系统迭代指南

## 📋 概述

本指南旨在确保系统功能迭代时数据库结构的稳定性和数据安全，避免因更新导致的数据丢失或服务中断。

## 🔄 迭代流程

### 1. 准备阶段

#### 1.1 环境备份

```bash
# 完整备份脚本
#!/bin/bash
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 1. 数据库备份
mysqldump -u passport_user -p passport_ocr > $BACKUP_DIR/database.sql

# 2. 代码备份
tar -czf $BACKUP_DIR/codebase.tar.gz \
    --exclude=node_modules \
    --exclude=build \
    --exclude=uploads \
    /www/wwwroot/passport.wanguo.co.nz/

# 3. 上传文件备份
tar -czf $BACKUP_DIR/uploads.tar.gz \
    /www/wwwroot/passport.wanguo.co.nz/uploads/

# 4. 配置文件备份
cp /www/wwwroot/passport.wanguo.co.nz/backend/.env $BACKUP_DIR/
cp /etc/nginx/sites-enabled/passport.wanguo.co.nz $BACKUP_DIR/

echo "备份完成: $BACKUP_DIR"
```

#### 1.2 创建测试环境

```bash
# 创建测试域名配置
# 测试域名: test.passport.wanguo.co.nz
```

### 2. 数据库迁移策略

#### 2.1 Sequelize迁移文件

创建迁移文件而不是直接修改模型：

```bash
# 创建迁移目录
mkdir -p backend/migrations

# 生成迁移文件
npx sequelize-cli migration:generate --name add-new-feature
```

#### 2.2 迁移文件示例

```javascript
// backend/migrations/20240101000000-add-new-field.js
'use strict';

module.exports = {
  // 升级操作
  up: async (queryInterface, Sequelize) => {
    // 添加新字段
    await queryInterface.addColumn('tourists', 'newField', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
    
    // 创建新表
    await queryInterface.createTable('NewTable', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  // 回滚操作
  down: async (queryInterface, Sequelize) => {
    // 删除新字段
    await queryInterface.removeColumn('tourists', 'newField');
    
    // 删除新表
    await queryInterface.dropTable('NewTable');
  }
};
```

#### 2.3 安全的数据库更新配置

更新 `config/database.js`：

```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'passport_ocr',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // 关键：不自动同步，使用迁移文件
    sync: false
  }
);

module.exports = sequelize;
```

### 3. 代码部署策略

#### 3.1 蓝绿部署脚本

```bash
#!/bin/bash
# blue-green-deploy.sh

PROJECT_DIR="/www/wwwroot/passport.wanguo.co.nz"
CURRENT_DIR="$PROJECT_DIR/current"
NEW_DIR="$PROJECT_DIR/releases/$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"

echo "🚀 开始蓝绿部署..."

# 1. 创建新版本目录
mkdir -p $NEW_DIR

# 2. 部署新代码
echo "📥 部署新代码到: $NEW_DIR"
# 这里可以是git clone或文件复制
cp -r $PROJECT_DIR/backend $NEW_DIR/
cp -r $PROJECT_DIR/frontend $NEW_DIR/

# 3. 安装依赖
cd $NEW_DIR/backend
npm install --production

cd $NEW_DIR/frontend
npm install
npm run build

# 4. 数据库迁移（如果有）
echo "🗄️ 执行数据库迁移..."
cd $NEW_DIR/backend
if [ -d "migrations" ]; then
    npx sequelize-cli db:migrate
fi

# 5. 健康检查
echo "🔍 健康检查..."
cd $NEW_DIR/backend
timeout 30 node scripts/healthCheck.js
if [ $? -ne 0 ]; then
    echo "❌ 健康检查失败，回滚"
    exit 1
fi

# 6. 切换版本
echo "🔄 切换到新版本..."
if [ -L $CURRENT_DIR ]; then
    rm $CURRENT_DIR
fi
ln -s $NEW_DIR $CURRENT_DIR

# 7. 重启服务
pm2 restart passport-backend

# 8. 验证部署
sleep 5
curl -f http://localhost:3060/api/health || {
    echo "❌ 部署验证失败，回滚"
    # 回滚逻辑
    exit 1
}

echo "✅ 部署成功！"
```

#### 3.2 健康检查脚本

```javascript
// backend/scripts/healthCheck.js
const sequelize = require('../config/database');
const models = require('../models');

async function healthCheck() {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接正常');
    
    // 测试关键模型
    const tourCount = await models.Tour.count();
    console.log(`✅ 数据完整性检查通过 (Tours: ${tourCount})`);
    
    // 测试关键API
    const express = require('express');
    const app = express();
    require('../server'); // 加载路由
    
    console.log('✅ 应用启动正常');
    process.exit(0);
  } catch (error) {
    console.error('❌ 健康检查失败:', error);
    process.exit(1);
  }
}

healthCheck();
```

### 4. 配置管理

#### 4.1 环境变量版本控制

```bash
# backend/.env.example
PORT=3060
NODE_ENV=production

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=passport_ocr
DB_USER=passport_user
DB_PASSWORD=

# 安全配置
JWT_SECRET=
OPENAI_API_KEY=

# 文件配置
UPLOAD_DIR=/www/wwwroot/passport.wanguo.co.nz/uploads
FRONTEND_URL=https://passport.wanguo.co.nz

# 新功能开关
FEATURE_EMAIL_VERIFICATION=true
FEATURE_ADVANCED_OCR=false
FEATURE_BULK_IMPORT=false

# 版本信息
APP_VERSION=1.2.0
LAST_UPDATED=2024-01-01
```

#### 4.2 功能开关管理

```javascript
// backend/utils/featureFlags.js
const featureFlags = {
  emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
  advancedOCR: process.env.FEATURE_ADVANCED_OCR === 'true',
  bulkImport: process.env.FEATURE_BULK_IMPORT === 'true'
};

function isFeatureEnabled(feature) {
  return featureFlags[feature] || false;
}

module.exports = { isFeatureEnabled, featureFlags };
```

### 5. 回滚策略

#### 5.1 快速回滚脚本

```bash
#!/bin/bash
# rollback.sh

PROJECT_DIR="/www/wwwroot/passport.wanguo.co.nz"
CURRENT_DIR="$PROJECT_DIR/current"
RELEASES_DIR="$PROJECT_DIR/releases"

echo "🔄 开始回滚..."

# 1. 获取上一个版本
LAST_RELEASE=$(ls -t $RELEASES_DIR | head -n 2 | tail -n 1)

if [ -z "$LAST_RELEASE" ]; then
    echo "❌ 没有找到可回滚的版本"
    exit 1
fi

echo "📦 回滚到版本: $LAST_RELEASE"

# 2. 数据库回滚（如果需要）
cd $RELEASES_DIR/$LAST_RELEASE/backend
if [ -d "migrations" ]; then
    echo "🗄️ 回滚数据库迁移..."
    npx sequelize-cli db:migrate:undo
fi

# 3. 切换版本
rm $CURRENT_DIR
ln -s $RELEASES_DIR/$LAST_RELEASE $CURRENT_DIR

# 4. 重启服务
pm2 restart passport-backend

# 5. 验证回滚
sleep 5
curl -f http://localhost:3060/api/health && echo "✅ 回滚成功！" || echo "❌ 回滚失败！"
```

### 6. 监控和告警

#### 6.1 应用监控

```javascript
// backend/middleware/monitoring.js
const fs = require('fs');
const path = require('path');

// 性能监控
function performanceMonitor(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent')
    };
    
    // 记录慢请求
    if (duration > 1000) {
      console.warn('慢请求:', logData);
    }
    
    // 写入日志文件
    const logFile = path.join(__dirname, '../logs/performance.log');
    fs.appendFileSync(logFile, JSON.stringify(logData) + '\n');
  });
  
  next();
}

module.exports = { performanceMonitor };
```

#### 6.2 数据库监控

```javascript
// backend/scripts/dbMonitor.js
const { Tour, Tourist, Salesperson } = require('../models');

async function generateReport() {
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      tours: await Tour.count(),
      tourists: await Tourist.count(),
      salespersons: await Salesperson.count(),
      recentTourists: await Tourist.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    };
    
    console.log('📊 数据库统计:', stats);
    
    // 发送到监控系统
    // await sendToMonitoring(stats);
    
  } catch (error) {
    console.error('监控失败:', error);
  }
}

// 每小时执行一次
setInterval(generateReport, 60 * 60 * 1000);
```

### 7. 测试策略

#### 7.1 自动化测试

```javascript
// backend/tests/integration.test.js
const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../config/database');

describe('集成测试', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });
  
  afterAll(async () => {
    await sequelize.close();
  });
  
  test('健康检查', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });
  
  test('数据库连接', async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });
});
```

#### 7.2 数据完整性测试

```javascript
// backend/scripts/dataIntegrityCheck.js
const models = require('../models');

async function checkDataIntegrity() {
  const issues = [];
  
  try {
    // 检查孤儿记录
    const orphanTourists = await models.Tourist.findAll({
      include: [{
        model: models.Tour,
        as: 'tour',
        required: false
      }],
      where: {
        '$tour.id$': null
      }
    });
    
    if (orphanTourists.length > 0) {
      issues.push(`发现 ${orphanTourists.length} 个孤儿游客记录`);
    }
    
    // 检查数据一致性
    const tourCount = await models.Tour.count();
    const touristCount = await models.Tourist.count();
    
    console.log(`数据统计: ${tourCount} 个旅游产品, ${touristCount} 个游客`);
    
    if (issues.length > 0) {
      console.warn('发现数据完整性问题:', issues);
      return false;
    }
    
    console.log('✅ 数据完整性检查通过');
    return true;
    
  } catch (error) {
    console.error('数据完整性检查失败:', error);
    return false;
  }
}

module.exports = { checkDataIntegrity };
```

## 🔧 迭代最佳实践

### 8.1 版本管理

1. **语义化版本控制**：
   - 主版本号：不兼容的API修改
   - 次版本号：向后兼容的功能性新增
   - 修订号：向后兼容的问题修正

2. **Git工作流**：
   ```bash
   # 功能分支
   git checkout -b feature/new-feature
   
   # 开发完成后合并到develop
   git checkout develop
   git merge feature/new-feature
   
   # 发布分支
   git checkout -b release/v1.2.0
   
   # 发布到生产
   git checkout main
   git merge release/v1.2.0
   git tag v1.2.0
   ```

### 8.2 数据库最佳实践

1. **永远不要**：
   - 直接删除表或列
   - 修改现有列的数据类型
   - 删除索引（除非确认不再使用）

2. **推荐做法**：
   - 使用迁移文件管理数据库变更
   - 新增列时设置默认值
   - 废弃字段标记为deprecated而不是删除
   - 重要操作前先备份

### 8.3 服务连续性

1. **零停机部署**：
   - 使用蓝绿部署或滚动部署
   - 数据库迁移前后兼容
   - 健康检查和自动回滚

2. **服务监控**：
   - 实时监控关键指标
   - 设置告警阈值
   - 自动故障恢复

## 📋 迭代检查清单

### 部署前检查

- [ ] 代码已通过所有测试
- [ ] 数据库备份已完成
- [ ] 迁移文件已准备并测试
- [ ] 功能开关已配置
- [ ] 健康检查脚本已准备
- [ ] 回滚方案已制定

### 部署中检查

- [ ] 数据库迁移成功执行
- [ ] 应用启动正常
- [ ] 健康检查通过
- [ ] 关键功能验证通过
- [ ] 性能指标正常

### 部署后监控

- [ ] 错误率监控
- [ ] 响应时间监控
- [ ] 数据库性能监控
- [ ] 用户反馈收集
- [ ] 业务指标跟踪

## 🆘 应急预案

### 问题分类

1. **P0 - 系统宕机**：
   - 立即执行回滚
   - 通知相关人员
   - 分析根本原因

2. **P1 - 功能异常**：
   - 使用功能开关禁用有问题的功能
   - 准备热修复
   - 安排紧急发布

3. **P2 - 性能问题**：
   - 监控系统资源
   - 优化数据库查询
   - 考虑扩容

### 联系方式

- **开发团队**：[开发人员联系方式]
- **运维团队**：[运维人员联系方式]
- **产品团队**：[产品人员联系方式]

---

## 📚 相关文档

- [宝塔部署指南](./BAOTA_DEPLOYMENT_GUIDE.md)
- [API文档](./API_DOCUMENTATION.md)
- [数据库设计文档](./DATABASE_DESIGN.md)
- [安全最佳实践](./SECURITY_GUIDE.md)

**遵循此指南，确保系统迭代过程中的稳定性和数据安全！** 🚀