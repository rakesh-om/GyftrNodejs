const db = require('../config/dbConnect');
const Webhook = require('../models/WebhookData');
const RefundData = require('../models/RefundData');
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const Gyterredeem = require('../models/GyftrRedemptions');
const deleteShopifyCoupon = require('../helpers/deleteShopifyCoupon');
const API_URL = process.env.API_BASE_URL;
const { Op, json } = require('sequelize');
const checkPaymentStatus = require('../helpers/checkPaymentStatus');
const callbackNotRecieved = require('../models/Cartdetails');


// Utility function to generate a 12-digit request ID
function generateRequestId() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}

/**
 * Webhook handler to save refund request data
 */
exports.saveRefundwebhook = async (req, res) => {
  console.log('Received refund webhook');
  try {
    const shop = req.query.shop;
    const refundData = req.body;
    const amount = refundData?.transactions?.[0]?.amount || null;
    const orderId = refundData?.order_id || null;
    // Prepare data to store in DB
    const payloadToStore = {
      refund_webhook_req: JSON.stringify(refundData),
      shop_name: shop || null,
      shop_id: refundData?.user_id?.toString() || null,
      shop_order_id: orderId,
      refunded: false,
      refund_amount: amount
    };

    // Save refund webhook to database
    await RefundData.create(payloadToStore);

    console.log('✅ Webhook data saved');
    return res.status(200).json({ message: 'Refund webhook saved successfully' });

  } catch (error) {
    console.error('❌ Error saving webhook data:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Webhook handler for order creation event
 * Saves order if it has a valid discount code and links to GyFTR redemptions
 */
exports.orderCreateWebhook = async (req, res) => {
  console.log('📥 Received order create webhook');
  try {
    const body = req.body;
    const shop = req.query.shop;
    const orderId = body.id;

    // 1. Extract discount code (if available)
    const discountCode = body.discount_codes?.[0]?.code;
    // 2. Extract note_attributes safely
    const noteAttributes = body.note_attributes || [];

    // 3. Check for specific attributes
    const useGyftrAttr = noteAttributes.find(attr => attr.name === 'use_gyftr');
    const gyftrAmountAttr = noteAttributes.find(attr => attr.name === 'gyftr_amount');

    // 4. Determine if it's a GyFTR order without discount_code
    const isGyftrNoteValid = useGyftrAttr?.value === 'yes' && gyftrAmountAttr?.value;
    
    if (isGyftrNoteValid) {
      console.log('🎟️ Valid Discount Code Found:', discountCode);

      // Save webhook to DB
      const payloadToStore = {
        webhookreq: JSON.stringify(body),
        shop_name: shop,
        shop_id: null,
        order_id: orderId,
        coupon_code: discountCode || null,
        use_gyftr: useGyftrAttr?.value || null,
        update_attribute: false
      };
      await Webhook.create(payloadToStore);
      console.log('✅ Webhook data saved to Webhook table');

      // Link redemption to Shopify order
      // const noteAttributes = req.body.note_attributes || [];
      // const gyfterOrderIdAttr = noteAttributes.find(attr => attr.name === 'gyfter_orderId');
      // const gyfterOrderId = gyfterOrderIdAttr?.value || null;
      // console.log("🆔 Gyfter Order ID:", gyfterOrderId);

      // const redemption = await Gyterredeem.findOne({ where: { gytr_order_id: gyfterOrderId } });
      // if (redemption) {
      //   await redemption.update({ shopify_order_id: orderId });
      //   console.log(`✅ Updated GyFTR redemption with shopify_order_id for coupon: ${discountCode}`);
      // } else {
      //   console.warn(`⚠️ No GyFTR redemption found for coupon code: ${discountCode}`);
      // }
    } 

    return res.status(200).json({ message: 'Order create webhook processed' });

  } catch (error) {
    console.error('❌ Error in orderCreateWebhook:', error.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Manually trigger refund with GyFTR
 * Fetches order, encrypts request, sends to GyFTR and parses response
 */
  exports.cartRefund = async (req, res) => {
  //console.log(req.params);
  //console.log(req);
  try {
    //const shop = 'gyfterom.myshopify.com'; // Can be dynamic later from req.body.shop
    const shop = req.query.shop;
    if (!shop) return res.status(400).json({ error: 'Missing shop in URL' });

    // 🔍 Lookup merchant
    const [merchant] = await db.query(
      'SELECT * FROM Setting WHERE shop = :shop',
      {
        replacements: { shop },
        type: db.QueryTypes.SELECT
      }
    );
    if (!merchant || merchant.length === 0) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    const { transactionId,couponId } = req.body;
    const { accessToken, userId, password, mid, shop: shopDomain } = merchant;

    // 🧨 Delete Shopify coupon
    const result = await deleteShopifyCoupon(couponId, shopDomain, accessToken);
    //console.log('coupon delete', JSON.stringify(result));

    // 🛑 GraphQL-level error
    if (result.success && result.data.errors && result.data.errors.length > 0) {
      console.error('❌ Shopify GraphQL Error:', result.data.errors);
      return res.status(400).json({
        success: false,
        message: 'GraphQL error while deleting coupon.',
        errors: result.data.errors
      });
    }

    // ✅ Safely access discountCodeDelete
    const deleteData = result.data?.data?.discountCodeDelete;

    if (
      deleteData &&
      deleteData.deletedCodeDiscountId &&
      deleteData.userErrors.length === 0
    ) {
      //console.log(`✅ Deleted coupon ${couponId}:`, result.data);

      // Step 1: Check GyFTR coupon status

     // const couponStatus = await CheckCouponStatus(couponId);

     const couponStatus = await Gyterredeem.findOne({
                          where: { gytr_order_id: transactionId },
                          attributes: ['refunded', 'requestid','mid','amount']
                        });


      if (!couponStatus) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      // Step 3: Proceed only if the coupon is not refunded and requestid is null
      if (couponStatus.refunded === false && couponStatus.requestid === null) {
        
        // Step 3: Check GyFTR payment status
        const requestPayload = {
          MID: couponStatus.mid,
          TID: "",
          SOURCE: "PG",
          PORDERID: transactionId
        };

        const key = merchant.enc_dec_api_key;   
        const iv = merchant.enc_dec_api_iv_key;
        const porderid = transactionId;
        const statusResponse = await checkPaymentStatus(requestPayload, userId, password,key,iv,porderid);

        if (
          statusResponse?.success &&
          statusResponse?.data?.status === 'TXN_SUCCESS' &&
          statusResponse?.data?.remark === 'SUCCESS'
        ) {
          const payload = {
            transactionId,
            requestId: generateRequestId(),
            refundType: 'B2S',
            refundAmount: couponStatus.amount // You can use Number(refundAmount)
          };

          const encryptedData = encrypt(JSON.stringify(payload), key, iv);
          const response = await axios.post(
            `${process.env.API_BASE_URL}/refundRequest`,
            { data: encryptedData },
            {
              headers: {
                'Content-Type': 'application/json',
                username: userId,
                password: password
              }
            }
          );

          // Handle encrypted response
          const encryptedResponse = response.data?.data || response.data;
          //console.log("📥 Encrypted response from GyFTR:", encryptedResponse);

          const decrypted = decrypt(encryptedResponse, key, iv);
          //console.log("🟢 Decrypted Response:", decrypted);

          let parsed;
          try {
            parsed = JSON.parse(decrypted);
          } catch (err) {
            parsed = { status: 'error', message: decrypted };
          }

          if (
            parsed?.status?.toLowerCase() === 'success' ||
            parsed?.message?.toLowerCase().includes('refunded successfully')
          ) {
            await Gyterredeem.update(
              { refunded: true, requestid: 'refunded successfully' },
              { where: { gytr_order_id: transactionId } }
            );
          }
        }
      }

      // 🎯 Final success response
      return res.status(200).json({
        success: true,
        message: 'Coupon deleted successfully.',
        deletedCouponId: deleteData.deletedCodeDiscountId
      });
    } else {
      // ❌ Failed to delete coupon due to userErrors or missing deletedCodeDiscountId
      const userErrors = deleteData?.userErrors || [];

      console.warn(`⚠️ Failed to delete coupon or has userErrors:`, userErrors);

      const errorMessage = userErrors.length > 0
        ? userErrors[0]?.message || 'Unknown error'
        : 'Unknown error during coupon deletion.';

      return res.status(400).json({
        success: false,
        message: 'Coupon not found or already deleted.',
        reason: errorMessage,
        userErrors: userErrors
      });
    }

  } catch (error) {
    console.error('🔥 Unexpected server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Fetch Webhook data when admin trigger to refund  and process refund
 */
exports.processPendingRefunds = async (req, res) => {
  try {
    // Step 1: Fetch refunds that are pending
    const pendingRefunds = await RefundData.findAll({
      where: {
        refunded: false,
        order_txn_id: null,
        refund_txn_id: null
      }
    });

    if (pendingRefunds.length === 0) {
      return res.status(200).json({ message: 'No pending refunds found.' });
    }

    const results = [];

    for (const refund of pendingRefunds) {
      const shopName = refund.shop_name;

      // Step 2: Fetch merchant credentials from Setting table
      const [merchant] = await db.query(
        'SELECT * FROM Setting WHERE shop = :shopName LIMIT 1',
        {
          replacements: { shopName },
          type: db.QueryTypes.SELECT
        }
      );

      if (!merchant) {
        console.warn(`⚠️ Merchant not found for shop: ${shopName}`);
        results.push({
          refund_id: refund.id,
          error: `Merchant credentials not found for ${shopName}`
        });
        continue;
      }

      const accessToken = merchant.accessToken;
      const shop = refund.shop_name;
      const orderId = refund.shop_order_id;
      const userId = merchant.userId;
      const password = merchant.password;
      const mid = merchant.mid;

      // Step 3: Fetch Shopify order details
      const orderResponse = await axios.get(
        `https://${shop}/admin/api/2024-01/orders/${orderId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      const order = orderResponse.data.order;
      const noteAttributes = order.note_attributes || [];
      const noteMap = {};
      noteAttributes.forEach(attr => {
        noteMap[attr.name] = attr.value;
      });

      // Step 4: Validate if order qualifies for GyFTR refund
      if (
        noteMap.use_gyfter === 'yes' &&
        noteMap.gyfter_amount &&
        noteMap.gyfter_coupon &&
        noteMap.gyfter_orderId
      ) {
        // Step 5: Check GyFTR payment status before refund
        const requestPayload = {
          MID: mid,
          TID: "",
          SOURCE: "PG",
          PORDERID: noteMap.gyfter_orderId // use actual GyFTR Order ID
        };
        
        const key = merchant.enc_dec_api_key;   
        const iv = merchant.enc_dec_api_iv_key;
        const porderid = noteMap.gyfter_orderId;
        const statusResponse = await checkPaymentStatus(requestPayload, userId, password, key,iv,porderid);



        // ✅ Proceed only if payment status is success
        if (
          statusResponse?.success &&
          statusResponse?.data?.status === 'TXN_SUCCESS' &&
          statusResponse?.data?.remark === 'SUCCESS'
        ) {
          const transactionId = noteMap.gyfter_orderId;
          const refundAmount = noteMap.gyfter_amount;
          const requestId = generateRequestId();
          const refundType = 'B2S';

          const payload = {
            transactionId,
            requestId,
            refundType,
            refundAmount: Number(refundAmount),
          };

          const encryptedData = encrypt(JSON.stringify(payload), key, iv);
          //console.log("📤 Encrypted Payload to Send:", encryptedData);

          try {
            // Step 6: Send refund request to GyFTR
            const response = await axios.post(
              `${process.env.API_BASE_URL}/refundRequest`,
              { data: encryptedData },
              {
                headers: {
                  'Content-Type': 'application/json',
                  username: merchant.userId,
                  password: merchant.password
                }
              }
            );

            const encryptedResponse = response.data?.data || response.data;
            const decrypted = decrypt(encryptedResponse,key, iv);
            //console.log("🟢 Decrypted Response:", decrypted);

            let parsed;
            try {
              parsed = JSON.parse(decrypted);
              const epay = parsed?.data?.epay;

              if (
                parsed.status === 'success' &&
                epay?.TXNSTATUS?.toLowerCase() === 'success' &&
                epay?.CODE === '00'
              ) {
                // ✅ Update RefundData on successful refund
                await RefundData.update(
                  {
                    refunded: true,
                    order_txn_id: epay.DRORDERID,
                    refund_txn_id: epay.TXNID
                  },
                  {
                    where: { id: refund.id }
                  }
                );

                results.push({
                  refund_id: refund.id,
                  order_txn_id: epay.DRORDERID,
                  refund_txn_id: epay.TXNID,
                  status: 'Refunded'
                });
              } else {
                console.warn(`❌ Refund failed: ${epay?.MESSAGE}`);
                results.push({
                  refund_id: refund.id,
                  order_txn_id: null,
                  refund_txn_id: null,
                  status: 'Failed',
                  message: epay?.MESSAGE || 'Unknown error'
                });
              }
            } catch (parseErr) {
              console.error("❌ JSON parse error:", parseErr.message);
              results.push({
                refund_id: refund.id,
                error: 'Failed to parse GyFTR response'
              });
            }
          } catch (refundErr) {
            console.error("❌ Refund request failed:", refundErr.message);
            results.push({
              refund_id: refund.id,
              error: 'Refund API error'
            });
          }
        } else {
          // ❌ Skip refund if payment not successful
          console.warn(`⛔ Skipping refund: Payment not marked as successful for PORDERID ${requestPayload.PORDERID}`);
          results.push({
            refund_id: refund.id,
            status: 'Skipped',
            message: 'Payment not completed or not successful'
          });
        }
      } else {
        console.warn("⚠️ Missing or invalid GyFTR note attributes.");
        results.push({
          refund_id: refund.id,
          status: 'Skipped',
          message: 'Invalid or missing GyFTR note attributes'
        });
      }
    }

    return res.status(200).json({
      message: 'Pending refunds processed',
      data: results
    });

  } catch (error) {
    console.error("❌ Error processing refunds:", error.message);
    return res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Auto refund handler for unprocessed GyFTR records
 */
exports.autoRefund = async (req, res) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  try {
    const records = await Gyterredeem.findAll({
      where: {
        refunded: false,
        shopify_order_id: null,
        redeemed_at: {
          [Op.lte]: tenMinutesAgo
        }
      },
      attributes: ['id', 'gytr_order_id', 'amount', 'mid', 'coupon_id']
    });

    if (records.length === 0) {
      return res.status(200).json({ success: true, message: 'No refunds to process.' });
    }

    const results = [];

    for (const record of records) {
      const transactionId = record.gytr_order_id;
      const requestId = generateRequestId();
      const refundType = 'B2S';
      const refundAmount = record.amount;
      const mid = record.mid;
      const couponId = record.coupon_id;

      // Fetch merchant credentials
      const [setting] = await db.query(
        'SELECT * FROM Setting WHERE mid = :mid LIMIT 1',
        {
          replacements: { mid },
          type: db.QueryTypes.SELECT
        }
      );

      if (!setting) {
        console.warn(`⚠️ No setting found for MID: ${mid}`);
        results.push({ gytr_order_id: transactionId, requestId, refundAmount, error: `MID not configured: ${mid}` });
        continue;
      }

      const userId = setting.userId;
      const password = setting.password;
      const shopDomain = setting.shop;
      const accessToken = setting.accessToken;

      // Step 1: Check GyFTR Payment Status
      const requestPayload = {
        MID: mid,
        TID: "",
        SOURCE: "PG",
        PORDERID: transactionId
      };
      const key = setting.enc_dec_api_key;   
      const iv = setting.enc_dec_api_iv_key;
      const porderid = transactionId;
      const statusResponse = await checkPaymentStatus(requestPayload, userId, password,key,iv,porderid);

      // ✅ Proceed only if payment status is success
      if (
        statusResponse?.success &&
        statusResponse?.data?.status === 'TXN_SUCCESS' &&
        statusResponse?.data?.remark === 'SUCCESS'
      ) {
        const payload = { transactionId, requestId, refundType, refundAmount };
        const encryptedData = encrypt(JSON.stringify(payload), key, iv);

        try {
          const response = await axios.post(
            `${process.env.API_BASE_URL}/refundRequest`,
            { data: encryptedData },
            {
              headers: {
                'Content-Type': 'application/json',
                username: userId,
                password: password
              }
            }
          );

          let encryptedResponse = response.data?.data || response.data;
          const decrypted = decrypt(encryptedResponse, key, iv);

          let parsed;
          try {
            parsed = JSON.parse(decrypted);
          } catch (err) {
            parsed = { status: 'error', message: decrypted };
          }

          if (
            parsed?.status?.toLowerCase() === 'success' ||
            parsed?.message?.toLowerCase().includes('refunded successfully')
          ) {
            await Gyterredeem.update(
              { refunded: true, requestid: 'refunded successfully' },
              { where: { id: record.id } }
            );

            // Delete coupon from Shopify
            const result = await deleteShopifyCoupon(couponId, shopDomain, accessToken);
            if (result.success) {
              console.log(`✅ Deleted coupon ${couponId}:`, result.data);
            } else {
              console.warn(`❌ Failed to delete coupon ${couponId}:`, result.error);
            }
          }

          results.push({ gytr_order_id: transactionId, requestId, refundAmount, response: parsed });

        } catch (err) {
          console.error(`❌ Refund failed for ${transactionId}:`, err.message);
          results.push({ gytr_order_id: transactionId, requestId, refundAmount, error: err.message });
        }

      } else {
        console.warn(`❌ Skipped refund for ${transactionId} — Payment not successful or incomplete.`);
        results.push({
          gytr_order_id: transactionId,
          requestId,
          refundAmount,
          error: 'Payment not successful. Refund skipped.'
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Auto refunds processed.', data: results });

  } catch (error) {
    console.error('❌ Error in autoRefund:', error);
    return res.status(500).json({ success: false, message: 'Internal server error in autoRefund.' });
  }
};


/**
 * Get payment status from GyFTR using encrypted payload
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const requestPayload = {
      MID: "GYTORGSHPLG.WTPG.5625",
      TID: "",
      SOURCE: "PG",
      PORDERID: "gyftr-1753268962780"
    };
    const userId = 'f04390ca-346b-4868-a9af-eed4b608cefd';
    const password = 'k8zWfD#Jnk8z-WfD-#Jn';
    const statusResponse = await checkPaymentStatus(requestPayload, userId, password);
    // ✅ Check TXN status and remark
    if (
      statusResponse.status === 'TXN_SUCCESS' &&
      statusResponse.remark &&
      statusResponse.remark.toLowerCase() === 'success'
    ) {


      // Example: return payment details
      return res.status(200).json({
        success: true,
        message: 'Payment successful',
        data: statusResponse
      });
    } else {
      console.warn('⚠️ Payment failed or incomplete');
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
        data: statusResponse
      });
    }
    //return res.status(200).json(statusResponse);

    const encryptedData = encrypt(JSON.stringify(requestPayload));
    console.log(encryptedData);

    const headers = {
      'Content-Type': 'application/json',
      'userId': 'f04390ca-346b-4868-a9af-eed4b608cefd',
      'password': 'k8zWfD#Jnk8z-WfD-#Jn'
    };

    const api_url =  `${process.env.API_BASE_URL}/paymentStatus`;
    const response = await axios.post(api_url, { data: encryptedData }, { headers });
    console.log("📦 Full GyFTR response:", response.data);

    const decryptedData = decrypt(response.data.data);
    console.log("🔓 Decrypted response:", decryptedData);

    const parsedData = JSON.parse(decryptedData);
    res.status(200).json(parsedData);

  } catch (err) {
    console.error('Error getting payment status:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  }
};



/**
 * Refund payment those transaction  call back not recieve and payment done and break communication  for any reason 
 */

exports.refundCallbacknotRecieved = async (req, res) =>{
  //const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
  try {
    
    const records = await callbackNotRecieved.findAll({
      where: {
        callback_received: false,
        Remark:null
        // createdAt: {
        //   [Op.lte]: sixtyMinutesAgo
        // }
      },
      attributes: ['id', 'porderid', 'total','mid']
    });
    if (records.length === 0) {
      return res.status(200).json({ success: true, message: 'No refunds to process.' });
    }
   
    const results = [];

    for (const record of records) {
      const transactionId = record.porderid;
      const requestId = generateRequestId();
      const refundType = 'B2S';
      const refundAmount = record.total;
      const mid = record.mid;

      // Fetch merchant credentials
      const [setting] = await db.query(
        'SELECT * FROM Setting WHERE mid = :mid LIMIT 1',

        {
          replacements: { mid },
          type: db.QueryTypes.SELECT
        }
      );
     
      if (!setting) {
        console.warn(`⚠️ No setting found for MID: ${mid}`);
        results.push({ gytr_order_id: transactionId, requestId, refundAmount, error: `MID not configured: ${mid}` });
        continue;
      }

      const userId = setting.userId;
      const password = setting.password;

      // Step 1: Check GyFTR Payment Status
      const requestPayload = {
        MID: mid,
        TID: "",
        SOURCE: "PG",
        PORDERID: transactionId
      };

      const key = setting.enc_dec_api_key;   
      const iv = setting.enc_dec_api_iv_key;
      const porderid = transactionId;
      const statusResponse = await checkPaymentStatus(requestPayload, userId, password,key,iv,porderid);

      // ✅ Proceed only if payment status is success
      if (
        statusResponse?.success &&
        statusResponse?.data?.status === 'TXN_SUCCESS' &&
        statusResponse?.data?.remark === 'SUCCESS'
      ) {
        const payload = { transactionId, requestId, refundType, refundAmount };
        const encryptedData = encrypt(JSON.stringify(payload),key,iv);

        try {
          const response = await axios.post(
             `${process.env.API_BASE_URL}/refundRequest`,
            { data: encryptedData },
            {
              headers: {
                'Content-Type': 'application/json',
                username: userId,
                password: password
              }
            }
          );

          let encryptedResponse = response.data?.data || response.data;
          const decrypted = decrypt(encryptedResponse,key,iv);

          let parsed;
          try {
            parsed = JSON.parse(decrypted);
          } catch (err) {
            parsed = { status: 'error', message: decrypted };
          }

          if (
            parsed?.status?.toLowerCase() === 'success' ||
            parsed?.message?.toLowerCase().includes('refunded successfully')
          ) {
            await callbackNotRecieved.update(
              { refunded: true, Remark: 'refunded successfully' },
              { where: { id: record.id } }
            );
          }

          results.push({ gytr_order_id: transactionId, requestId, refundAmount, response: parsed });

        } catch (err) {
          console.error(`❌ Refund failed for ${transactionId}:`, err.message);
          results.push({ gytr_order_id: transactionId, requestId, refundAmount, error: err.message });
        }

      } else {
        await callbackNotRecieved.update(
              {Remark: 'Payment Not completed this order' },
              { where: { id: record.id } }
            );
        console.warn(`❌ Skipped refund for ${transactionId} — Payment not successful or incomplete.`);
        results.push({
          gytr_order_id: transactionId,
          requestId,
          refundAmount,
          error: 'Payment not successful. Refund skipped.'
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Auto refunds processed.', data: results });

  } catch (error) {
    console.error('❌ Error in autoRefund:', error);
    return res.status(500).json({ success: false, message: 'Internal server error in autoRefund.' });
  }
}


exports.tesRefund = async (req, res) => {
  try {
    const payload = {
      transactionId: 'gyftr-1754395384924',
      requestId: generateRequestId(),
      refundType: 'B2S',
      refundAmount: 8
    };

    const encryptedData = encrypt(JSON.stringify(payload));
    const response = await axios.post(
       `${process.env.API_BASE_URL}/refundRequest`,
      { data: encryptedData },
      {
        headers: {
          'Content-Type': 'application/json',
          username: 'f04390ca-346b-4868-a9af-eed4b608cefd',
          password: 'k8zWfD#Jnk8z-WfD-#Jn'
        }
      }
    );

    let encryptedResponse = response.data?.data || response.data;
    console.log("📥 Encrypted response from GyFTR:", encryptedResponse);
    const decrypted = decrypt(encryptedResponse);
    console.log("🟢 Decrypted Response:", decrypted);

    let parsed;
    try {
      parsed = JSON.parse(decrypted);
    } catch (err) {
      parsed = { status: 'error', message: decrypted };
    }

    const txnStatus = parsed?.data?.epay?.TXNSTATUS;
    const txnId = parsed?.data?.epay?.TXNID;

    if (parsed.status === 'success' && txnStatus === 'Success') {
      return res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        TXNSTATUS: txnStatus,
        TXNID: txnId
      });
    } else {
      return res.status(400).json({
        success: false,
        message: parsed?.message || 'Refund failed',
        TXNSTATUS: txnStatus || 'N/A'
      });
    }
  } catch (error) {
    console.error('❌ Error in tesRefund:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

