const { DataTypes, Op } = require('sequelize');
const sequelize = require('../config/database');

const OCRLog = sequelize.define('OCRLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 关联信息
  touristId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tourists',
      key: 'id'
    }
  },
  uploadLink: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // 操作信息
  operationType: {
    type: DataTypes.ENUM('preview', 'upload', 'update'),
    allowNull: false
  },
  operatorName: {
    type: DataTypes.STRING,
    defaultValue: '游客'
  },
  operatorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'salespersons',
      key: 'id'
    }
  },
  
  // 图像信息
  imagePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  imageSize: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  imageQuality: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // OCR识别信息
  ocrStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'success', 'failed'),
    defaultValue: 'pending'
  },
  ocrModel: {
    type: DataTypes.STRING,
    defaultValue: 'gpt-4o-mini'
  },
  ocrDuration: {
    type: DataTypes.INTEGER, // 识别耗时（毫秒）
    defaultValue: 0
  },
  recognizedData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ocrError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 用户确认的数据
  confirmedData: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // 额外信息
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ocr_logs',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [
    { fields: ['touristId'] },
    { fields: ['uploadLink'] },
    { fields: ['ocrStatus'] },
    { fields: ['createdAt'] }
  ]
});

// Static method for statistics
OCRLog.getStatistics = async function(dateFrom, dateTo) {
  const whereCondition = {};
  if (dateFrom || dateTo) {
    whereCondition.createdAt = {};
    if (dateFrom) whereCondition.createdAt[Op.gte] = dateFrom;
    if (dateTo) whereCondition.createdAt[Op.lte] = dateTo;
  }
  
  const stats = await this.findAll({
    where: whereCondition,
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'success' THEN 1 ELSE 0 END")), 'successCount'],
      [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'failed' THEN 1 ELSE 0 END")), 'failedCount'],
      [sequelize.fn('AVG', sequelize.col('ocrDuration')), 'avgDuration'],
      [sequelize.fn('SUM', sequelize.col('ocrDuration')), 'totalDuration']
    ],
    raw: true
  });
  
  const result = stats[0] || {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    avgDuration: 0,
    totalDuration: 0
  };
  
  // Convert strings to numbers
  return {
    totalCount: parseInt(result.totalCount) || 0,
    successCount: parseInt(result.successCount) || 0,
    failedCount: parseInt(result.failedCount) || 0,
    avgDuration: parseFloat(result.avgDuration) || 0,
    totalDuration: parseInt(result.totalDuration) || 0
  };
};

module.exports = OCRLog;