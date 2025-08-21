const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect'); // Sequelize instance

const Webhook = db.define('Webhook', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  webhookreq: {
    type: DataTypes.TEXT,
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
  coupon_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  use_gyftr: {
    type: DataTypes.STRING,
    allowNull: true
  },
  order_id:{
    type: DataTypes.BIGINT,
    allowNull: true,
    //unique: true
  },
  update_attribute:{
    type: DataTypes.BOOLEAN,
    defaultValue: false
    
  },


}, {
  tableName: 'Webhook',
  timestamps: true // createdAt and updatedAt will be auto-managed
});

module.exports = Webhook;
