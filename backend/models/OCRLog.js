const mongoose = require('mongoose');

const ocrLogSchema = new mongoose.Schema({
  // 关联信息
  touristId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tourist',
    default: null
  },
  uploadLink: {
    type: String,
    required: true
  },
  
  // 操作信息
  operationType: {
    type: String,
    enum: ['preview', 'upload', 'update'],
    required: true
  },
  operatorName: {
    type: String,
    default: '游客'
  },
  operatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesperson',
    default: null
  },
  
  // 图像信息
  imagePath: {
    type: String,
    required: true
  },
  imageSize: {
    type: Number,
    default: 0
  },
  imageQuality: {
    isValid: Boolean,
    issues: [String],
    metadata: {
      width: Number,
      height: Number,
      format: String,
      size: Number
    }
  },
  
  // OCR识别信息
  ocrStatus: {
    type: String,
    enum: ['pending', 'processing', 'success', 'failed'],
    default: 'pending'
  },
  ocrModel: {
    type: String,
    default: 'gpt-4o-mini'
  },
  ocrDuration: {
    type: Number, // 识别耗时（毫秒）
    default: 0
  },
  recognizedData: {
    fullName: String,
    chineseName: String,
    passportNumber: String,
    gender: String,
    nationality: String,
    birthDate: Date,
    issueDate: Date,
    expiryDate: Date,
    birthPlace: String
  },
  ocrError: {
    type: String,
    default: null
  },
  
  // 用户确认的数据
  confirmedData: {
    fullName: String,
    passportNumber: String,
    gender: String,
    nationality: String,
    birthDate: Date,
    issueDate: Date,
    expiryDate: Date,
    birthPlace: String,
    contactPhone: String,
    contactEmail: String
  },
  
  // 额外信息
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 添加索引
ocrLogSchema.index({ touristId: 1 });
ocrLogSchema.index({ uploadLink: 1 });
ocrLogSchema.index({ ocrStatus: 1 });
ocrLogSchema.index({ createdAt: -1 });

// 静态方法：获取统计信息
ocrLogSchema.statics.getStatistics = async function(dateFrom, dateTo) {
  const query = {};
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = dateFrom;
    if (dateTo) query.createdAt.$lte = dateTo;
  }
  
  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$ocrStatus', 'success'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$ocrStatus', 'failed'] }, 1, 0] }
        },
        avgDuration: { $avg: '$ocrDuration' },
        totalDuration: { $sum: '$ocrDuration' }
      }
    }
  ]);
  
  return stats[0] || {
    totalCount: 0,
    successCount: 0,
    failedCount: 0,
    avgDuration: 0,
    totalDuration: 0
  };
};

module.exports = mongoose.model('OCRLog', ocrLogSchema);