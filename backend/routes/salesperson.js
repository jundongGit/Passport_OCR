const express = require('express');
const router = express.Router();
const salespersonController = require('../controllers/salespersonController');
const { adminAuth } = require('../middleware/auth');

// 所有路由都需要管理员权限
router.get('/', adminAuth, salespersonController.getAllSalespersons);
router.post('/', adminAuth, salespersonController.createSalesperson);
router.put('/:id', adminAuth, salespersonController.updateSalesperson);
router.post('/:id/reset-password', adminAuth, salespersonController.resetSalespersonPassword);
router.delete('/:id', adminAuth, salespersonController.deleteSalesperson);
router.get('/:id/stats', adminAuth, salespersonController.getSalespersonStats);

module.exports = router;