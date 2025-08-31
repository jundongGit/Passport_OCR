const Salesperson = require('../models/Salesperson');

// 初始化系统 - 创建默认管理员账号
exports.initSystem = async (req, res) => {
  try {
    // 检查是否已有管理员
    const adminExists = await Salesperson.findOne({ role: 'admin' });
    
    if (adminExists) {
      return res.json({
        success: true,
        message: '系统已初始化',
        data: {
          admin: {
            name: adminExists.name,
            email: adminExists.email,
            role: adminExists.role
          },
          loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
          note: '管理员账号已存在，请使用现有账号登录'
        }
      });
    }

    // 创建默认管理员
    const admin = new Salesperson({
      name: '系统管理员',
      email: 'admin@passport.com',
      password: 'admin123456',
      role: 'admin',
      department: '系统管理'
    });

    await admin.save();

    res.json({
      success: true,
      message: '系统初始化成功！默认管理员账号已创建',
      data: {
        admin: {
          name: admin.name,
          email: admin.email,
          role: admin.role,
          defaultPassword: 'admin123456'
        },
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
        instructions: [
          '1. 使用上述邮箱和密码登录管理后台',
          '2. 登录后请立即修改默认密码',
          '3. 开始创建销售人员账号和旅游产品'
        ]
      }
    });
  } catch (error) {
    console.error('System initialization error:', error);
    res.status(500).json({
      success: false,
      error: '系统初始化失败: ' + error.message
    });
  }
};

// 获取系统状态
exports.getSystemStatus = async (req, res) => {
  try {
    const adminCount = await Salesperson.countDocuments({ role: 'admin' });
    const salespersonCount = await Salesperson.countDocuments({ role: 'salesperson' });
    
    res.json({
      success: true,
      data: {
        initialized: adminCount > 0,
        adminCount,
        salespersonCount,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000/login',
        adminUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin` : 'http://localhost:3000/admin',
        salesUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/sales` : 'http://localhost:3000/sales'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};