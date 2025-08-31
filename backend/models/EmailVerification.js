const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  uploadLink: {
    type: String,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加索引以提高查询性能
emailVerificationSchema.index({ email: 1, uploadLink: 1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引，自动删除过期记录

// 静态方法：创建或更新验证码
emailVerificationSchema.statics.createOrUpdateVerification = async function(email, uploadLink, code) {
  return await this.findOneAndUpdate(
    { email, uploadLink },
    {
      code,
      verified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      createdAt: new Date()
    },
    { upsert: true, new: true }
  );
};

// 静态方法：验证验证码
emailVerificationSchema.statics.verifyCode = async function(email, uploadLink, code) {
  const verification = await this.findOne({ 
    email, 
    uploadLink, 
    expiresAt: { $gt: new Date() } 
  });

  if (!verification) {
    return { success: false, error: '验证码不存在或已过期' };
  }

  if (verification.verified) {
    return { success: false, error: '验证码已使用' };
  }

  if (verification.attempts >= verification.maxAttempts) {
    return { success: false, error: '验证码尝试次数过多，请重新获取' };
  }

  // 增加尝试次数
  verification.attempts += 1;
  await verification.save();

  if (verification.code !== code) {
    return { success: false, error: '验证码错误' };
  }

  // 验证成功，标记为已验证
  verification.verified = true;
  await verification.save();

  return { success: true };
};

// 静态方法：检查邮箱是否已验证
emailVerificationSchema.statics.isEmailVerified = async function(email, uploadLink) {
  const verification = await this.findOne({ 
    email, 
    uploadLink, 
    verified: true,
    expiresAt: { $gt: new Date() }
  });

  return !!verification;
};

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);