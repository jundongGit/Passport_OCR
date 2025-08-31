const express = require('express');
const router = express.Router();
const ocrLogController = require('../controllers/ocrLogController');
const { auth, adminAuth } = require('../middleware/auth');

// 获取OCR日志列表（管理员专用）
router.get('/', adminAuth, ocrLogController.getOCRLogs);

// 获取OCR统计信息（管理员专用）
router.get('/statistics', adminAuth, ocrLogController.getOCRStatistics);

// 获取单个OCR日志详情（管理员专用）
router.get('/:id', adminAuth, ocrLogController.getOCRLogById);

// 删除OCR日志（管理员专用）
router.delete('/:id', adminAuth, ocrLogController.deleteOCRLog);

// 批量删除OCR日志（管理员专用）
router.post('/batch-delete', adminAuth, ocrLogController.batchDeleteOCRLogs);

module.exports = router;