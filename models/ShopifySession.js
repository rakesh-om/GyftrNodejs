const { DataTypes } = require('sequelize');
const db = require('../config/dbConnect'); // Sequelize instance

const ShopifySession = db.define(
  "shopify_sessions",
  {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
    },
    shop: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isOnline: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    scope: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    expires: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    onlineAccessInfo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    accessToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    onboarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    storefront_access_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "shopify_sessions",
    timestamps: false,
  }
);

module.exports = ShopifySession;