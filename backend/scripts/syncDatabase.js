const sequelize = require('../config/database');
const models = require('../models');

async function syncDatabase() {
  try {
    console.log('开始同步数据库...');
    
    // 测试连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 同步所有模型
    await sequelize.sync({ force: false, alter: true });
    console.log('数据库模型同步成功');
    
    // 创建默认管理员账号
    const { Salesperson } = models;
    const adminExists = await Salesperson.findOne({ 
      where: { role: 'admin' } 
    });
    
    if (!adminExists) {
      await Salesperson.create({
        name: '系统管理员',
        email: 'admin@passport.com',
        password: 'admin123456',
        role: 'admin',
        department: '系统管理'
      });
      console.log('默认管理员账号创建成功');
      console.log('账号: admin@passport.com');
      console.log('密码: admin123456');
    } else {
      console.log('管理员账号已存在');
    }
    
    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库同步失败:', error);
    process.exit(1);
  }
}

syncDatabase();