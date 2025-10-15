const Salesperson = require('../models/Salesperson');

// 获取所有销售人员（管理员）
exports.getAllSalespersons = async (req, res) => {
  try {
    const salespersons = await Salesperson.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: salespersons
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 创建销售人员（管理员）
exports.createSalesperson = async (req, res) => {
  try {
    const { name, email, password, phone, department } = req.body;

    // 验证必填字段
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '姓名、邮箱和密码为必填项'
      });
    }

    // 检查邮箱是否已存在
    const existingSalesperson = await Salesperson.findOne({
      where: { email }
    });
    if (existingSalesperson) {
      return res.status(400).json({
        success: false,
        error: '该邮箱已被注册'
      });
    }

    // 创建新销售人员
    const salesperson = await Salesperson.create({
      name,
      email,
      password,
      phone,
      department,
      role: 'salesperson'
    });

    res.status(201).json({
      success: true,
      message: '销售人员创建成功',
      data: salesperson.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 更新销售人员信息（管理员）
exports.updateSalesperson = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, department, isActive } = req.body;

    const salesperson = await Salesperson.findByPk(id);

    if (!salesperson) {
      return res.status(404).json({
        success: false,
        error: '销售人员不存在'
      });
    }

    // 如果要更改邮箱，检查新邮箱是否已存在
    if (email && email !== salesperson.email) {
      const existingSalesperson = await Salesperson.findOne({
        where: { email }
      });
      if (existingSalesperson) {
        return res.status(400).json({
          success: false,
          error: '该邮箱已被使用'
        });
      }
    }

    // 更新字段
    if (name !== undefined) salesperson.name = name;
    if (email !== undefined) salesperson.email = email;
    if (phone !== undefined) salesperson.phone = phone;
    if (department !== undefined) salesperson.department = department;
    if (isActive !== undefined) salesperson.isActive = isActive;

    await salesperson.save();

    res.json({
      success: true,
      message: '更新成功',
      data: salesperson.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 重置销售人员密码（管理员）
exports.resetSalespersonPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码长度至少6位'
      });
    }

    const salesperson = await Salesperson.findByPk(id);

    if (!salesperson) {
      return res.status(404).json({
        success: false,
        error: '销售人员不存在'
      });
    }

    salesperson.password = newPassword;
    await salesperson.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 删除销售人员（管理员）
exports.deleteSalesperson = async (req, res) => {
  try {
    const { id } = req.params;

    const salesperson = await Salesperson.findByPk(id);

    if (!salesperson) {
      return res.status(404).json({
        success: false,
        error: '销售人员不存在'
      });
    }

    // 不允许删除管理员
    if (salesperson.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: '不能删除管理员账号'
      });
    }

    await salesperson.destroy();

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取销售人员统计信息
exports.getSalespersonStats = async (req, res) => {
  try {
    const { id } = req.params;

    const salesperson = await Salesperson.findByPk(id);

    if (!salesperson) {
      return res.status(404).json({
        success: false,
        error: '销售人员不存在'
      });
    }

    // 获取该销售人员添加的游客数量
    const { Tourist } = require('../models');
    const touristCount = await Tourist.count({
      where: { salespersonId: salesperson.id }
    });

    res.json({
      success: true,
      data: {
        salesperson: salesperson.toJSON(),
        stats: {
          touristCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};