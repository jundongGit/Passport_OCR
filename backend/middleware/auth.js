const jwt = require('jsonwebtoken');
const Salesperson = require('../models/Salesperson');

// 验证JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const salesperson = await Salesperson.findOne({
      where: {
        id: decoded.id,
        isActive: true
      }
    });

    if (!salesperson) {
      throw new Error();
    }

    req.token = token;
    req.salesperson = salesperson;
    req.salespersonId = salesperson.id;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: '请先登录' });
  }
};

// 验证管理员权限
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const salesperson = await Salesperson.findOne({
      where: {
        id: decoded.id,
        isActive: true
      }
    });

    if (!salesperson || salesperson.role !== 'admin') {
      throw new Error();
    }

    req.token = token;
    req.salesperson = salesperson;
    req.salespersonId = salesperson.id;
    next();
  } catch (error) {
    res.status(403).json({ success: false, error: '需要管理员权限' });
  }
};

// 可选的认证（不强制）
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const salesperson = await Salesperson.findOne({
        where: {
          id: decoded.id,
          isActive: true
        }
      });

      if (salesperson) {
        req.token = token;
        req.salesperson = salesperson;
        req.salespersonId = salesperson.id;
      }
    }
    next();
  } catch (error) {
    // 忽略错误，继续执行
    next();
  }
};

module.exports = { auth, adminAuth, optionalAuth };