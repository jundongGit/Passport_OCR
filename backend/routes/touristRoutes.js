const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const touristController = require('../controllers/touristController');
const { auth, optionalAuth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'passport-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG/JPG/PNG 格式的图片'));
    }
  }
});

router.get('/', auth, touristController.getAllTourists);
router.post('/', auth, touristController.createTourist);
router.get('/tour/:tourId', auth, touristController.getTouristsByTour);
router.get('/link/:uploadLink', touristController.getTouristByUploadLink);
router.get('/:id', auth, touristController.getTouristById);
router.put('/:id', auth, touristController.updateTourist);
router.post('/:id/update-passport', optionalAuth, upload.single('passport'), touristController.updatePassportPhoto);
router.delete('/:id', auth, touristController.deleteTourist);

module.exports = router;