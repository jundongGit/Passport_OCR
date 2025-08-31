const express = require('express');
const router = express.Router();
const initController = require('../controllers/initController');

// 系统初始化路由（公开访问）
router.get('/', initController.initSystem);
router.post('/', initController.initSystem);
router.get('/status', initController.getSystemStatus);

module.exports = router;