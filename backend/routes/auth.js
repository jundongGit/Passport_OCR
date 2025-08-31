const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// 公开路由
router.post('/login', authController.login);
router.post('/create-admin', authController.createAdmin); // 初始化管理员账号
router.get('/create-admin', authController.createAdmin); // 初始化管理员账号（GET方式，方便测试）

// 需要认证的路由
router.get('/me', auth, authController.getCurrentUser);
router.post('/change-password', auth, authController.changePassword);
router.post('/logout', auth, authController.logout);

module.exports = router;