const { Salesperson } = require('../models');
const bcrypt = require('bcryptjs');

// 销售人员登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '请提供用户名和密码'
      });
    }

    // 查找销售人员（使用用户名）
    const salesperson = await Salesperson.findOne({
      where: { username, isActive: true }
    });

    if (!salesperson) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 验证密码
    const isPasswordValid = await salesperson.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      });
    }

    // 更新最后登录时间
    await salesperson.updateLastLogin();

    // 生成token
    const token = salesperson.generateAuthToken();

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: salesperson.id,
          name: salesperson.name,
          username: salesperson.username,
          email: salesperson.email,
          role: salesperson.role,
          department: salesperson.department
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败，请重试'
    });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    const salesperson = await Salesperson.findByPk(req.salespersonId);
    
    if (!salesperson) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: salesperson
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 修改密码
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: '请提供旧密码和新密码'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码长度至少6位'
      });
    }

    const salesperson = await Salesperson.findByPk(req.salespersonId);
    
    // 验证旧密码
    const isPasswordValid = await salesperson.comparePassword(oldPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '旧密码错误'
      });
    }

    // 更新密码
    salesperson.password = newPassword;
    await salesperson.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 退出登录（前端清除token即可，这里可以记录日志）
exports.logout = async (req, res) => {
  try {
    // 可以在这里添加退出登录的日志记录
    res.json({
      success: true,
      message: '退出成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建管理员账号（初始化用）
exports.createAdmin = async (req, res) => {
  try {
    // 检查是否已有管理员
    const adminExists = await Salesperson.findOne({ 
      where: { role: 'admin' } 
    });
    
    if (adminExists) {
      return res.status(400).json({
        success: false,
        error: '管理员账号已存在'
      });
    }

    // 创建默认管理员
    const admin = await Salesperson.create({
      name: '系统管理员',
      username: 'admin',
      email: 'admin@passport.com',
      password: 'admin123456',
      role: 'admin',
      department: '系统管理'
    });

    res.json({
      success: true,
      message: '管理员账号创建成功',
      data: {
        username: admin.username,
        email: admin.email,
        defaultPassword: 'admin123456'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};