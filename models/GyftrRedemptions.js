// models/Cartdetails.js
const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect'); // your Sequelize instance
const { request } = require('express');

const Cartdetails = db.define('GyftrRedemptions', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  shopify_order_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
   gytr_order_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  coupon_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  coupon_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  amount: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  requestid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  redeemed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  refunded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }

}, {
  tableName: 'GyftrRedemptions',
  timestamps: false // Set to true if you want createdAt/updatedAt
});

// Sync the model with the database
async function syncDatabase() {
  try {
    await db.sync({ alter: true }); // or { force: true } to drop & recreate
    console.log('✅ Redeem  table synchronized.'); 
  } catch (error) {
    console.error('❌ Failed to sync Cartdetails table:', error);
  }
}

syncDatabase();

module.exports = Cartdetails;
