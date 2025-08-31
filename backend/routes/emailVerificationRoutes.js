const express = require('express');
const router = express.Router();
const emailVerificationController = require('../controllers/emailVerificationController');

// 发送验证码
router.post('/send-code', emailVerificationController.sendVerificationCode);

// 验证验证码
router.post('/verify-code', emailVerificationController.verifyCode);

// 检查验证状态
router.get('/status', emailVerificationController.checkVerificationStatus);

module.exports = router;