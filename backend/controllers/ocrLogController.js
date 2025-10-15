const { OCRLog, Tourist, Salesperson } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
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

    const where = {};

    // 状态筛选
    if (status && status !== 'all') {
      where.ocrStatus = status;
    }

    // 操作类型筛选
    if (operationType && operationType !== 'all') {
      where.operationType = operationType;
    }

    // 上传链接筛选
    if (uploadLink) {
      where.uploadLink = { [Op.like]: `%${uploadLink}%` };
    }

    // 日期范围筛选
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt[Op.lte] = new Date(moment(dateTo).endOf('day'));
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows: logs } = await OCRLog.findAndCountAll({
      where,
      include: [
        {
          model: Tourist,
          as: 'tourist',
          attributes: ['touristName'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      offset: offset,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
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

    // 构建基础查询条件
    const buildWhere = (start, end) => {
      const where = {};
      if (start || end) {
        where.createdAt = {};
        if (start) where.createdAt[Op.gte] = start;
        if (end) where.createdAt[Op.lte] = end;
      }
      return where;
    };

    // 总体统计
    const overallWhere = buildWhere(
      dateFrom ? new Date(dateFrom) : null,
      dateTo ? new Date(moment(dateTo).endOf('day')) : null
    );

    const overallStats = await OCRLog.findAll({
      where: overallWhere,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'success' THEN 1 ELSE 0 END")), 'successCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'failed' THEN 1 ELSE 0 END")), 'failedCount'],
        [sequelize.fn('AVG', sequelize.col('ocrDuration')), 'avgDuration']
      ],
      raw: true
    });

    // 今日统计
    const todayStart = moment().startOf('day').toDate();
    const todayEnd = moment().endOf('day').toDate();
    const todayStats = await OCRLog.findAll({
      where: buildWhere(todayStart, todayEnd),
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'success' THEN 1 ELSE 0 END")), 'successCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'failed' THEN 1 ELSE 0 END")), 'failedCount']
      ],
      raw: true
    });

    // 最近7天统计
    const weekStart = moment().subtract(7, 'days').startOf('day').toDate();
    const weekStats = await OCRLog.findAll({
      where: buildWhere(weekStart, null),
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'success' THEN 1 ELSE 0 END")), 'successCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'failed' THEN 1 ELSE 0 END")), 'failedCount']
      ],
      raw: true
    });

    // 按日期分组的统计（最近30天）
    const monthStart = moment().subtract(30, 'days').startOf('day').toDate();
    const dailyStats = await OCRLog.findAll({
      where: {
        createdAt: { [Op.gte]: monthStart }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'success' THEN 1 ELSE 0 END")), 'successCount'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN ocrStatus = 'failed' THEN 1 ELSE 0 END")), 'failedCount'],
        [sequelize.fn('AVG', sequelize.col('ocrDuration')), 'avgDuration']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        overall: overallStats[0] || { totalCount: 0, successCount: 0, failedCount: 0, avgDuration: 0 },
        today: todayStats[0] || { totalCount: 0, successCount: 0, failedCount: 0 },
        week: weekStats[0] || { totalCount: 0, successCount: 0, failedCount: 0 },
        daily: dailyStats.map(stat => ({
          _id: stat.date,
          ...stat
        }))
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
    const log = await OCRLog.findByPk(req.params.id, {
      include: [
        {
          model: Tourist,
          as: 'tourist',
          attributes: ['touristName', 'salesName']
        },
        {
          model: Salesperson,
          as: 'operator',
          attributes: ['name', 'email']
        }
      ]
    });

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
    const log = await OCRLog.findByPk(req.params.id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: '日志记录不存在'
      });
    }

    await log.destroy();

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

    const deletedCount = await OCRLog.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });

    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 条日志记录`
    });
  } catch (error) {
    console.error('批量删除OCR日志失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
