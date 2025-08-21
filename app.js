const express = require('express');
const colors = require('colors');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();
dotenv.config();

// Import DB and models
const db = require('./config/dbConnect');
require('./models/Cartdetails');
require('./models/RefundData');
require('./models/WebhookData');
require('./models/GyftrRedemptions');


// Call Cron Jon 
// require('./cronJobs/autoRefunds');
// require('./cronJobs/AdminRefunds');
// require('./cronJobs/RefundCallbacknotRecieved');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS settings
app.use(cors({
  origin: 'https://gyfterom.myshopify.com',
  methods: ['GET', 'POST'],
  credentials: true
}));

// Routes
const gyfterPayRoutes = require('./routes/api');
app.use('/api/payment', gyfterPayRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

// Sync models and start server
const PORT = process.env.PORT || 8090;

db.sync({ alter: true }) // Create or update tables
  .then(() => {
    console.log('✅ Sequelize models synced successfully.'.green);
    app.listen(PORT, () => {
      console.log(`🚀 Node Server is running in ${process.env.DEV_MODE} mode on port ${PORT}`.bgCyan.white);
    });
  })
  .catch(err => {
    console.error('❌ Error syncing Sequelize models:', err);
  });
