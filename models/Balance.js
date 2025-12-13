const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect');

const Balance = db.define('Balance', {
    userid: {
    type: DataTypes.STRING,
    allowNull: false  },
  balance:{
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0.0
  }
  
}, {
  tableName: 'Balance',
  timestamps: true,
});

module.exports = {Balance};
