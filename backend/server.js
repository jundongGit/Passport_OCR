const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const tourRoutes = require('./routes/tourRoutes');
const touristRoutes = require('./routes/touristRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const exportRoutes = require('./routes/exportRoutes');
const authRoutes = require('./routes/auth');
const salespersonRoutes = require('./routes/salesperson');
const initRoutes = require('./routes/init');
const ocrLogRoutes = require('./routes/ocrLogRoutes');
const emailVerificationRoutes = require('./routes/emailVerificationRoutes');

app.use('/api/tours', tourRoutes);
app.use('/api/tourists', touristRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/salespersons', salespersonRoutes);
app.use('/api/init', initRoutes);
app.use('/api/ocr-logs', ocrLogRoutes);
app.use('/api/email-verification', emailVerificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 3060;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});