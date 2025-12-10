// config/dbConnect.js
const { Sequelize } = require('sequelize');
require('dotenv').config();


const db = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false // Set to true for SQL logging
  }
);

module.exports = db;
