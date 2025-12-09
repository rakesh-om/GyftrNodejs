const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect');

const Balance = db.define('Balance', {
  shop: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  remaining_balance: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
}, {
  tableName: 'Balance',
  timestamps: true
});

module.exports = Balance;
