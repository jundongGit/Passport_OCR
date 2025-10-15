const sequelize = require('../config/database');
const Tour = require('../models/Tour');
const Tourist = require('../models/Tourist');
const Salesperson = require('../models/Salesperson');
const OCRLog = require('../models/OCRLog');

async function clearTestData() {
  try {
    console.log('正在连接数据库...');
    await sequelize.authenticate();
    console.log('数据库连接成功！');

    // 清空测试数据（保留管理员账户）
    console.log('\n开始清空测试数据...');

    // 1. 清空OCR日志
    const ocrCount = await OCRLog.destroy({ where: {} });
    console.log(`✓ 已删除 ${ocrCount} 条OCR日志`);

    // 2. 清空游客数据
    const touristCount = await Tourist.destroy({ where: {} });
    console.log(`✓ 已删除 ${touristCount} 条游客记录`);

    // 3. 清空旅游产品
    const tourCount = await Tour.destroy({ where: {} });
    console.log(`✓ 已删除 ${tourCount} 条旅游产品`);

    // 4. 清空销售人员（保留管理员）
    const salesCount = await Salesperson.destroy({
      where: {
        role: 'salesperson'
      }
    });
    console.log(`✓ 已删除 ${salesCount} 条销售人员记录`);

    // 显示保留的管理员账户
    const admins = await Salesperson.findAll({ where: { role: 'admin' } });
    console.log(`\n保留的管理员账户：`);
    admins.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.email})`);
    });

    console.log('\n✅ 测试数据清空完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 清空数据失败:', error);
    process.exit(1);
  }
}

clearTestData();
