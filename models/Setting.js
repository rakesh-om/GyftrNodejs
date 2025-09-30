const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect');  // Sequelize instance, same as in your Webhook model

const Setting = db.define(
  "Setting",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mid: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
    },
    accessToken: {
      type: DataTypes.STRING(191),
      allowNull: true,
    },
    shop: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    brand_name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    enc_dec_api_iv_key: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    enc_dec_api_key: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    hash_salt: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    reverse_salt: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    shopid: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
    user_name: {
      type: DataTypes.STRING(191),
      allowNull: false,
    },
  },
  {
    tableName: "Setting",
    timestamps: false,
  }
);

module.exports = Setting;
