const { EmailVerification, Tourist } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../utils/emailService');

// 发送验证码
exports.sendVerificationCode = async (req, res) => {
  try {
    const { email, uploadLink } = req.body;

    if (!email || !uploadLink) {
      return res.status(400).json({
        success: false,
        error: '邮箱和上传链接不能为空'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: '邮箱格式不正确'
      });
    }

    // 验证上传链接是否有效
    const tourist = await Tourist.findOne({ where: { uploadLink } });
    if (!tourist) {
      return res.status(404).json({
        success: false,
        error: '无效的上传链接'
      });
    }

    // 检查频率限制（同一邮箱1分钟内只能发送一次）
    const recentVerification = await EmailVerification.findOne({
      where: {
        email,
        uploadLink,
        createdAt: { [Op.gt]: new Date(Date.now() - 60 * 1000) }
      }
    });

    if (recentVerification) {
      return res.status(429).json({
        success: false,
        error: '验证码发送过于频繁，请1分钟后再试'
      });
    }

    // 生成验证码
    const code = emailService.generateVerificationCode();
    
    // 保存验证码到数据库
    await EmailVerification.createOrUpdateVerification(email, uploadLink, code);
    
    // 发送邮件
    const emailResult = await emailService.sendVerificationCode(email, code);
    
    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: '验证码发送失败，请重试'
      });
    }

    res.json({
      success: true,
      message: '验证码已发送到您的邮箱，请查收'
    });

  } catch (error) {
    console.error('Send verification code error:', error);
    res.status(500).json({
      success: false,
      error: '发送验证码失败'
    });
  }
};

// 验证验证码
exports.verifyCode = async (req, res) => {
  try {
    const { email, uploadLink, code } = req.body;

    if (!email || !uploadLink || !code) {
      return res.status(400).json({
        success: false,
        error: '邮箱、上传链接和验证码不能为空'
      });
    }

    // 验证验证码
    const verificationResult = await EmailVerification.verifyCode(email, uploadLink, code);
    
    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        error: verificationResult.error
      });
    }

    res.json({
      success: true,
      message: '邮箱验证成功'
    });

  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({
      success: false,
      error: '验证失败'
    });
  }
};

// 检查邮箱验证状态
exports.checkVerificationStatus = async (req, res) => {
  try {
    const { email, uploadLink } = req.query;

    if (!email || !uploadLink) {
      return res.status(400).json({
        success: false,
        error: '邮箱和上传链接不能为空'
      });
    }

    const isVerified = await EmailVerification.isEmailVerified(email, uploadLink);

    res.json({
      success: true,
      verified: isVerified
    });

  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      error: '检查验证状态失败'
    });
  }
};