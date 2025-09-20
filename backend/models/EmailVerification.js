const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const EmailVerification = sequelize.define('EmailVerification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  uploadLink: {
    type: DataTypes.STRING,
    allowNull: false
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: () => new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
  }
}, {
  tableName: 'email_verifications',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { 
      fields: ['email', 'uploadLink'],
      unique: false
    },
    { 
      fields: ['expiresAt']
    }
  ]
});

// Static method: Create or update verification
EmailVerification.createOrUpdateVerification = async function(email, uploadLink, code) {
  const [verification, created] = await this.findOrCreate({
    where: { email, uploadLink },
    defaults: {
      code,
      verified: false,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  if (!created) {
    verification.code = code;
    verification.verified = false;
    verification.attempts = 0;
    verification.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await verification.save();
  }

  return verification;
};

// Static method: Verify code
EmailVerification.verifyCode = async function(email, uploadLink, code) {
  const verification = await this.findOne({ 
    where: { 
      email, 
      uploadLink, 
      expiresAt: { [Op.gt]: new Date() } 
    } 
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

// Static method: Check if email is verified
EmailVerification.isEmailVerified = async function(email, uploadLink) {
  const verification = await this.findOne({ 
    where: { 
      email, 
      uploadLink, 
      verified: true,
      expiresAt: { [Op.gt]: new Date() }
    } 
  });

  return !!verification;
};

module.exports = EmailVerification;