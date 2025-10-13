// models/Cartdetails.js
const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect'); // your Sequelize instance

const Cartdetails = db.define('Cartdetails', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  total: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  porderid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
   shopid: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  tid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  baseUrl: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  CouponCode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mobile: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  callback_received: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  Remark: {
    type: DataTypes.STRING,
    allowNull: true
  },
  Refund_Status: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

}, {
  tableName: 'Cartdetails',
  timestamps: true 
});

// Sync the model with the database
async function syncDatabase() {
  try {
    await db.sync();
    console.log('✅ Cartdetails table synchronized.');
  } catch (error) {
    console.error('❌ Failed to sync Cartdetails table:', error);
  }
}

syncDatabase();

module.exports = Cartdetails;
