const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { auth } = require('../middleware/auth');

router.post('/passport-photos', auth, exportController.exportPassportPhotos);

module.exports = router;