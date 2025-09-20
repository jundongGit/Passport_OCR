const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Tourist = sequelize.define('Tourist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tourId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tours',
      key: 'id'
    }
  },
  touristName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  salesName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  salespersonId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'salespersons',
      key: 'id'
    }
  },
  // 新增字段
  ekok: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    },
    set(value) {
      if (value) {
        this.setDataValue('contactEmail', value.toLowerCase().trim());
      }
    }
  },
  birthPlace: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  touristType: {
    type: DataTypes.ENUM('ADT', 'CHD'),
    defaultValue: 'ADT'
  },
  roomType: {
    type: DataTypes.ENUM('单人间', '双人间'),
    allowNull: true
  },
  passportPhoto: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passportName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passportNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('M', 'F'),
    allowNull: true
  },
  passportIssueDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passportExpiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  passportBirthDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  uploadLink: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  uploadStatus: {
    type: DataTypes.ENUM('pending', 'uploaded', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Recognized data as JSON
  recognizedData: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'tourists',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = Tourist;