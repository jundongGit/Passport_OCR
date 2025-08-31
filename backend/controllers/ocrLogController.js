const OCRLog = require('../models/OCRLog');
const moment = require('moment');

// 获取OCR日志列表
exports.getOCRLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      operationType, 
      dateFrom, 
      dateTo,
      uploadLink 
    } = req.query;
    
    const query = {};
    
    // 状态筛选
    if (status && status !== 'all') {
      query.ocrStatus = status;
    }
    
    // 操作类型筛选
    if (operationType && operationType !== 'all') {
      query.operationType = operationType;
    }
    
    // 上传链接筛选
    if (uploadLink) {
      query.uploadLink = { $regex: uploadLink, $options: 'i' };
    }
    
    // 日期范围筛选
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(moment(dateTo).endOf('day'));
      }
    }
    
    const skip = (page - 1) * limit;
    
    const logs = await OCRLog.find(query)
      .populate('touristId', 'touristName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await OCRLog.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取OCR日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取OCR统计信息
exports.getOCRStatistics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const stats = await OCRLog.getStatistics(
      dateFrom ? new Date(dateFrom) : null,
      dateTo ? new Date(moment(dateTo).endOf('day')) : null
    );
    
    // 获取今日统计
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const todayStats = await OCRLog.getStatistics(todayStart, todayEnd);
    
    // 获取最近7天统计
    const weekStart = moment().subtract(7, 'days').startOf('day').toDate();
    const weekStats = await OCRLog.getStatistics(weekStart, null);
    
    // 按日期分组的统计（最近30天）
    const monthStart = moment().subtract(30, 'days').startOf('day').toDate();
    const dailyStats = await OCRLog.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalCount: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$ocrStatus', 'success'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$ocrStatus', 'failed'] }, 1, 0] }
          },
          avgDuration: { $avg: '$ocrDuration' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        overall: stats,
        today: todayStats,
        week: weekStats,
        daily: dailyStats
      }
    });
  } catch (error) {
    console.error('获取OCR统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 获取单个OCR日志详情
exports.getOCRLogById = async (req, res) => {
  try {
    const log = await OCRLog.findById(req.params.id)
      .populate('touristId', 'touristName salesName')
      .populate('operatorId', 'name email');
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: '日志记录不存在'
      });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('获取OCR日志详情失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 删除OCR日志
exports.deleteOCRLog = async (req, res) => {
  try {
    const log = await OCRLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: '日志记录不存在'
      });
    }
    
    await OCRLog.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: '日志删除成功'
    });
  } catch (error) {
    console.error('删除OCR日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 批量删除OCR日志
exports.batchDeleteOCRLogs = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供要删除的日志ID列表'
      });
    }
    
    const result = await OCRLog.deleteMany({
      _id: { $in: ids }
    });
    
    res.json({
      success: true,
      message: `成功删除 ${result.deletedCount} 条日志记录`
    });
  } catch (error) {
    console.error('批量删除OCR日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};