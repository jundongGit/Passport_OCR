const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const touristController = require('../controllers/touristController');

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

router.get('/', touristController.getAllTourists);
router.post('/', touristController.createTourist);
router.get('/tour/:tourId', touristController.getTouristsByTour);
router.get('/link/:uploadLink', touristController.getTouristByUploadLink);
router.get('/:id', touristController.getTouristById);
router.put('/:id', touristController.updateTourist);
router.post('/:id/update-passport', upload.single('passport'), touristController.updatePassportPhoto);
router.delete('/:id', touristController.deleteTourist);

module.exports = router;