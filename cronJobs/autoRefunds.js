const cron = require('node-cron');
const { autoRefund } = require('../controllers/refundController');

/**
 * CRON JOB: Auto Refund Processor
 * Schedule: Runs every 2 minutes
 * Purpose: Automatically triggers the `autoRefund` controller to process
 *          pending GyFTR refund requests and delete related Shopify coupons
 */
cron.schedule('*/2 * * * *', async () => {
  console.log('⏰ Running autoRefund cron job...');

  try {
    // Simulate an Express-like req/res object since this isn't running inside an HTTP server
    await autoRefund(
      { body: {}, query: {} }, // Dummy request object
      {
        status: (code) => ({
          json: (msg) => console.log(`✅ [${code}] Response:`, msg)
        })
      }
    );
  } catch (error) {
    // Log any error that occurs during the cron execution
    console.error('❌ Cron error:', error.message || error);
  }
});
