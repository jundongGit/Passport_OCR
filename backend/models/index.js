const Tour = require('./Tour');
const Tourist = require('./Tourist');
const Salesperson = require('./Salesperson');
const OCRLog = require('./OCRLog');
const EmailVerification = require('./EmailVerification');

// Define associations
Tour.hasMany(Tourist, { 
  foreignKey: 'tourId', 
  as: 'tourists',
  onDelete: 'CASCADE' 
});
Tourist.belongsTo(Tour, { 
  foreignKey: 'tourId', 
  as: 'tour' 
});

Salesperson.hasMany(Tourist, { 
  foreignKey: 'salespersonId', 
  as: 'tourists' 
});
Tourist.belongsTo(Salesperson, { 
  foreignKey: 'salespersonId', 
  as: 'salesperson' 
});

Tourist.hasMany(OCRLog, { 
  foreignKey: 'touristId', 
  as: 'ocrLogs',
  onDelete: 'CASCADE' 
});
OCRLog.belongsTo(Tourist, { 
  foreignKey: 'touristId', 
  as: 'tourist' 
});

Salesperson.hasMany(OCRLog, { 
  foreignKey: 'operatorId', 
  as: 'ocrLogs' 
});
OCRLog.belongsTo(Salesperson, { 
  foreignKey: 'operatorId', 
  as: 'operator' 
});

module.exports = {
  Tour,
  Tourist,
  Salesperson,
  OCRLog,
  EmailVerification
};