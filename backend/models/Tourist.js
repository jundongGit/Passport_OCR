const mongoose = require('mongoose');

const touristSchema = new mongoose.Schema({
  tourId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tour',
    required: true
  },
  touristName: {
    type: String,
    required: true,
    trim: true
  },
  salesName: {
    type: String,
    required: true,
    trim: true
  },
  salespersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salesperson',
    default: null
  },
  // 新增字段
  ekok: {
    type: String,
    default: null,
    trim: true
  },
  contactPhone: {
    type: String,
    default: null,
    trim: true
  },
  contactEmail: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },
  birthPlace: {
    type: String,
    default: null,
    trim: true
  },
  remarks: {
    type: String,
    default: null,
    trim: true
  },
  touristType: {
    type: String,
    enum: ['ADT', 'CHD'],
    default: 'ADT'
  },
  roomType: {
    type: String,
    enum: ['单人间', '双人间', null],
    default: null
  },
  passportPhoto: {
    type: String,
    default: null
  },
  passportName: {
    type: String,
    default: null,
    trim: true
  },
  passportNumber: {
    type: String,
    default: null,
    trim: true
  },
  nationality: {
    type: String,
    default: null,
    trim: true
  },
  gender: {
    type: String,
    enum: ['M', 'F', null],
    default: null
  },
  passportIssueDate: {
    type: Date,
    default: null
  },
  passportExpiryDate: {
    type: Date,
    default: null
  },
  passportBirthDate: {
    type: Date,
    default: null
  },
  uploadLink: {
    type: String,
    unique: true,
    required: true
  },
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploaded', 'verified', 'rejected'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    default: null
  },
  recognizedData: {
    name: String,
    passportNumber: String,
    gender: String,
    nationality: String,
    birthDate: Date,
    birthPlace: String,
    issueDate: Date,
    expiryDate: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

touristSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Tourist', touristSchema);