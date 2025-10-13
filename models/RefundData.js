// models/Cartdetails.js
const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect'); // your Sequelize instance

const Cartdetails = db.define('Refund', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shop_order_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refund_webhook_req: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  order_txn_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refund_amount: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refund_txn_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shop_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  shop_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refunded: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }

}, {
  tableName: 'Refund',
  timestamps: false // Set to true if you want createdAt/updatedAt
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
