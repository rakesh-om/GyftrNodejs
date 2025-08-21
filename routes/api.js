const express = require('express');
const router = express.Router();

// Middleware to validate the Shopify store (if needed)
const validateShop = require('../middlewares/validateShop');

// Controllers
const customerController = require("../controllers/initiateGyfterPay.js");
const paymentController = require('../controllers/paymentController.js');
const refundController = require('../controllers/refundController');
const DeleteCoupon = require('../controllers/DeleteCoupon.js');
const UpdateAttribute =  require('../controllers/UpdateAttribute.js');




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



// ================================
// Update Attribute
//=================================

// Update attribute if coupon  remove from cart page

router.post('/updateAttribute',UpdateAttribute.updateAttribute);

// Export the router
module.exports = router;
