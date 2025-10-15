const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Salesperson = sequelize.define('Salesperson', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50]
    },
    set(value) {
      this.setDataValue('username', value.toLowerCase().trim());
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    },
    set(value) {
      this.setDataValue('email', value.toLowerCase().trim());
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  role: {
    type: DataTypes.ENUM('salesperson', 'admin'),
    defaultValue: 'salesperson'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'salespersons',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  hooks: {
    beforeSave: async (salesperson) => {
      if (salesperson.changed('password')) {
        salesperson.password = await bcrypt.hash(salesperson.password, 10);
      }
    }
  }
});

// Instance methods
Salesperson.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

Salesperson.prototype.generateAuthToken = function() {
  const token = jwt.sign(
    {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      name: this.name
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
  return token;
};

Salesperson.prototype.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  await this.save();
};

Salesperson.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Salesperson;