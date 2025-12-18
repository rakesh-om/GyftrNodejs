const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect');

const Balance = db.define('Balance', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  balance: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  }
}, {
  tableName: 'Balance',
  timestamps: true
});

module.exports = {Balance};
