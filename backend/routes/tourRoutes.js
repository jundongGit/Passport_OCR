const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const { auth, adminAuth } = require('../middleware/auth');

router.post('/', auth, tourController.createTour);
router.get('/', auth, tourController.getAllTours);
router.get('/:id', auth, tourController.getTourById);
router.put('/:id', auth, tourController.updateTour);
router.delete('/:id', auth, tourController.deleteTour);

module.exports = router;