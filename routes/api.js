const express = require('express');
const router = express.Router();

// Middleware to validate the Shopify store (if needed)
const validateShop = require('../middlewares/validateShop');
const {verifyToken} = require("../middlewares/auth.js")
// Db Connectivity
const db = require('../config/dbConnect'); 

// Controllers
const customerController = require("../controllers/initiateGyfterPay.js");
const paymentController = require('../controllers/paymentController.js');
const refundController = require('../controllers/refundController');
const DeleteCoupon = require('../controllers/DeleteCoupon.js');
const UpdateAttribute =  require('../controllers/UpdateAttribute.js');

const {
  getSetting,
  createSetting,
  updateSetting,
} = require("../controllers/settingController.js");




router.get("/setting",verifyToken, getSetting);
router.post("/setting",verifyToken,createSetting);
router.put("/setting",verifyToken,updateSetting);  


// ==========================
// 💳 GyfterPay Customer API
// ==========================

// Initiate GyfterPay process for a customer
router.post('/initiate-gyfterpay', customerController.initiateGyfterpay);

// Encrypt sensitive payload (e.g. card info, PII)
router.post('/encpayload', customerController.encryptpayload);


// ==========================
// 💸 Payment API
// ==========================

// Render payment form (GET endpoint)
router.get('/', paymentController.renderForm);

// Initiate a payment (validates shop first)
router.post('/initiate', validateShop, paymentController.initiatePayment);

// Handle payment gateway callback/response
router.post('/callback', express.urlencoded({ extended: false }), paymentController.handleCallback);


// ==========================
// 🔁 Refund API
// ==========================

// Save refund webhook data (e.g. for logs, analytics)
router.post('/refundwebhook', refundController.saveRefundwebhook);

// Manually trigger a refund
router.post('/refund', refundController.processPendingRefunds);

// Shopify order creation webhook (used for refund flow maybe)
router.post('/order_create_webhook', refundController.orderCreateWebhook);

// Auto Refund if user not complete there  order 
router.post('/autorefund', refundController.autoRefund);

// Refund If  Coupon remove from cart page 
router.post('/cartrefund', refundController.cartRefund);

//Test Refund  API for Reund process

router.post('/testrefund',refundController.tesRefund);

// Get payment Status 
router.post('/getpaymentstatus', refundController.getPaymentStatus);

//refundCallbacknotRecieved  if call back not recieved 
router.post('/refundCallbacknotRecieved',refundController.refundCallbacknotRecieved);

// ==========================
// 🎟️ Coupon Management
// ==========================



router.post('/getcouponStatus',DeleteCoupon.getCouponStatus);


// ==========================
// 🛒 Shopify App Webhooks
// ==========================

router.post('/webbbbhooksssss/app/uninstalled', (req, res) => {
  console.log("App uninstalled webhook received:", req.body);
  res.sendStatus(200);
});

// App Uninstalled Webhook
router.post('/webhooks/app/uninstalled', async (req, res) => {
  try {
    const shopData = req.body;
    const shopId = shopData.id;       // Shopify shop ID
    const shopDomain = shopData.domain; // Optional: shop domain

    console.log("App uninstalled for shopId:", shopId);

    if (!shopId) {
      console.error("No shopId received in webhook payload");
      return res.sendStatus(200);
    }

    // Delete the shop record from Setting table
    await db.query(
      'DELETE FROM Setting WHERE shopid = :shopid',
      {
        replacements: { shopid: shopId },
        type: db.QueryTypes.DELETE
      }
    );

    console.log(`Deleted shop with shopid ${shopId} from Setting table`);
    res.sendStatus(200);

  } catch (error) {
    console.error("Error handling uninstall webhook:", error);
    res.sendStatus(500);
  }
});

router.post('/webhooks/app/scopes_update', (req, res) => {
  console.log("App scopes_update webhook received:", req.body);
  res.sendStatus(200);
});


// ================================
// Update Attribute
//=================================

// Update attribute if coupon  remove from cart page

router.post('/updateAttribute',UpdateAttribute.updateAttribute);

// Export the router
module.exports = router;
