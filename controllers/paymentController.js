  const phpUnserialize = require('php-unserialize'); 
  const { generateHash, reverseHashData } = require('../utils/hashUtil');
  const axios = require('axios');
  const { encrypt, decrypt } = require('../utils/gyftrCrypto');
  const db = require('../config/dbConnect');
  const GYFTR_TEST_URL = process.env.GYFTR_TEST_URL
  const { createDiscountCoupon } = require('../helpers/CreateCoupon.js');
  const Cartdetails = require('../models/Cartdetails.js');
  const GyftrRedeem = require('../models/GyftrRedemptions.js');
  const Piutility = require('../helpers/encdec.js');
  const FluentBitLogger = require('../helpers/FluentLogger.js');
  const moment = require('moment');


  exports.renderForm = (req, res) => {
    res.send(`
      <form action="/api/payment/initiate" method="post">
        <label>Mobile Number:</label><input name="mobile" /><br/>
        <label>Amount:</label><input name="txnamount" /><br/>
        <label>Order ID:</label><input name="porderid" /><br/>
        <input type="submit" value="Initiate Payment" />
      </form>
    `);
  };


   
   


  /**
   * initiatePayment
   * ---------------
   * 1. Validates required input fields.
   * 2. Fetches merchant settings from DB.
   * 3. Persists initial cart details.
   * 4. Prepares payload for GyFTR.
   * 5. Generates security hash.
   * 6. Constructs and returns an auto-submit HTML form.
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */ 
   

  async function logDbQuery({ apiName, logMsg, request, response }) {
    try {
      const dbConnection = new FluentBitLogger();

      let documentlogs = {
        api_name: apiName || "db_query",
        log_msg: logMsg || "DB query executed",
        createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        log_data: {
          request,
          response
        }
      };

      // Optional: Encrypt sensitive fields like mobile
      if (documentlogs.log_data?.request?.params?.mobile) {
        documentlogs.log_data.request.params.mobile = await Piutility.piEncryption(
          documentlogs.log_data.request.params.mobile
        );
      }

      if (documentlogs.log_data?.response?.mobile) {
        documentlogs.log_data.response.mobile = await Piutility.piEncryption(
          documentlogs.log_data.response.mobile
        );
      }

      // Stringify log_data before saving (like your other logs)
      documentlogs.log_data = JSON.stringify(documentlogs.log_data);

      // Save logs conditionally based on env
      if (process.env.STATUS === "production" || process.env.STATUS === "staging") {
        await dbConnection.query(documentlogs);
      } else {
        exports.wrapper_log("info", JSON.stringify(documentlogs));
      }

    } catch (error) {
      console.error("Failed to log DB query:", error);
    }
  }


  /**
   * Handles payment initiation logic, hashes payload and submits to GyFTR
   */
  
  exports.initiatePayment = async (req, res) => {
    try {

      // Step 1: Destructure input parameters
      const { txnamount, porderid, mobile, baseUrl } = req.body;
      // Step 1a: Validate presence of mandatory fields
      if (!mobile || !txnamount || !porderid) {
        return res.status(400).json({ error: 'Missing mobile, txnamount, or porderid' });
      }

      //Incrept mobile number before save into DB
        const encmobile = await Piutility.piEncryption(mobile);

      // Step 2: Fetch merchant information using shop identifier
        const shop = req.shopDomain;
        const shopId = req.headers['shopify-edge-metadata-shop-id'];
        console.log('Initiating payment for:', shop);
        
      try {
        // Query Setting table for merchant details
        const [merchant] = await db.query(
          'SELECT brand_name,mid,shopid,hash_salt FROM Setting WHERE shopid = :shopId LIMIT 1',
          {
            replacements: { shopId: shopId },
            type: db.QueryTypes.SELECT
          }
        );

        await logDbQuery({
          apiName: 'initiatePayment',
          logMsg: 'Merchant fetch query result',
          request: {
            params: { shopId }
          },
          response: merchant
        });
        // Step 2a: Handle missing merchant record
        if (!merchant) {
          return res.status(404).json({ error: 'Merchant not found' });
        }
        // Step 3: Build unique transaction ID and retrieve salt
        const brandName = merchant.brand_name;
        const shop_id = merchant.shopid;
        const updateTid = `${brandName}-${shop_id}`;
        const salt = merchant.hash_salt

        // Step 4: Persist initial cart detail record
        const newRecord = await Cartdetails.create({
          porderid: porderid,
          total: txnamount,
          tid: updateTid,
          baseUrl: baseUrl,
          shopid: shopId,
          status: 'PENDING',
          mid:merchant.mid,
          mobile:encmobile
        }); 

        const mid = merchant.mid;
        const tid = updateTid;
        if (!mobile || !txnamount || !porderid) {
          return res.status(400).json({ error: 'Missing mobile, txnamount, or porderid' });
        }

        // Save log  into Fluent Log
        const moment = require("moment");
        
        try {
            const dbConnection = new FluentBitLogger();

            let documentlogs = {
              api_name: "initiatePayment",
              ip_address: req.socket.localAddress || "",
              log_data: {
                api_version: 'V2',        
                enforce_prefix: '',       
                merchant_sub_mid: '',     
                mid,                      
                mobile:mobile,                  
                porderid,                 
                return_url: process.env.CALL_BACK_URL, 
                source: 'W',              
                tid,                      
                txnamount:txnamount  
              },
              log_msg: "Initiate Payment",
              mobile: mobile,  
              porderid,
              brand_name: brandName,
            };

            // Add createdDate
            documentlogs.createdDate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Encrypt mobile
            if (documentlogs?.mobile) {
              documentlogs.mobile = await Piutility.piEncryption(documentlogs.mobile);
            }

            // Process log_data
            if (typeof documentlogs.log_data === "object") {
              documentlogs.log_data = Object.assign({}, documentlogs.log_data);

              // Encrypt mobile if exists in log_data
              if (documentlogs.log_data.mobile) {
                documentlogs.log_data.mobile = await Piutility.piEncryption(documentlogs.log_data.mobile);
              }

              // Stringify for storage
              documentlogs.log_data = JSON.stringify(documentlogs.log_data);
            }

            // Save to FluentBit only in production
            if (process.env.STATUS === "production" || process.env.STATUS === "staging") {
              await dbConnection.query(documentlogs);
            } else {
              exports.wrapper_log("info", JSON.stringify(documentlogs));
            }
          } catch (error) {
            console.log("Erro Occur during log save", error);
          }
        
        
        // Step 5: Prepare POST data for GyFTR
        const postData = {
          api_version: 'V2',        // API version constant
          enforce_prefix: '',       // Optional prefix
          merchant_sub_mid: '',     // Optional sub-MID
          mid,                      // Merchant ID
          mobile,                   // Customer mobile number
          porderid,                 // Order identifier
          return_url: process.env.CALL_BACK_URL,  // Callback URL
          source: 'W',              // Source identifier
          tid,                      // Unique transaction ID
          txnamount:txnamount              // Transaction amount
        };

        // Step 6: Generate security hash and attach to payload
        const hash = generateHash(postData, salt);
        postData.hash = hash;

        // Step 7: Build auto-submitting HTML form
        let formHtml = `<html><body onload="document.forms[0].submit()">`;
        formHtml += `<form method="POST" action="${GYFTR_TEST_URL}">`;

        for (let key in postData) {
          formHtml += `<input type="hidden" name="${key}" value="${postData[key]}" />`;
        }

        formHtml += `</form></body></html>`;

        // Step 8: Send HTML form to client
        res.setHeader('Content-Type', 'text/html');
        res.send(formHtml);
      } catch (error) {
        // Handle database or Cartdetails.create errors
        console.error("Gift card creation error:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }

    } catch (error) {
      // Catch-all for unexpected errors
      console.error('Error initiating payment:', error.message);
    }

  };

  /**
   * Callback endpoint to receive response from GyFTR after payment
   */

  exports.handleCallback = async (req, res) => {

    // console.log('call back handle');
      // return res.status(200).json({ message: 'Callback handled successfully' });
    // Step 1: Validate presence of inputData
    try {
      const inputData = req.body.inputData;
      if (!inputData) {
        return res.status(400).send('Invalid callback data.');
      }

      // Step 2: Unserialize PHP-style serialized string
      const parsedData = phpUnserialize.unserialize(inputData);
      //console.log('response data', parsedData);
      const api_version = parsedData.api_version;
      const mid = parsedData.mid;
      const status = parsedData.status;
      const mobile = parsedData.mobile;
      const porderid = parsedData.porderid;
      const amount = parsedData.redeemed_amount;//parsedData.txnAmount;
      const CouponCode = parsedData.walletRedemptionTxnId; //`ePay-${mobile}`;
      //const return_url = parsedData.return_url;
      //const source = parsedData.source;
      //const tid = parsedData.tid;
      const txnAmount = parsedData.txnAmount;
      const reverseHash = parsedData.reverseHash;
      const originalPaymentDetails = parsedData.paymentDetails;
      // Step 3: Prepare data for signature verification
      const paymentDetailsArray = Object.values(originalPaymentDetails).map((item) => ({
        type: item.type,
        mode: item.mode,
        amount: item.amount,
        txnId: item.txnId
      }));
      const hashInput = {
        "status_code": parsedData.status_code,
        "status": parsedData.status,
        "remark": parsedData.remark,
        "mobile": parsedData.mobile,
        "mid": parsedData.mid,
        "tid": parsedData.tid,
        "txnAmount": parsedData.txnAmount,
        "return_url": parsedData.return_url,
        "porderid": parsedData.porderid,
        "source": parsedData.source,
        "api_version": parsedData.api_version,
        "walletRedemptionTxnId": parsedData.walletRedemptionTxnId,
        "paymentDetails": paymentDetailsArray,
        "pg_name": parsedData.pg_name,
        "redeemed_amount": parsedData.redeemed_amount,
        "balance_to_collect": parsedData.balance_to_collect
      };

      // Save log  into Fluent Log
        const moment = require("moment");
        
        try {
            const dbConnection = new FluentBitLogger();

            let documentlogs = {
              api_name: "callbackRecieved",
              ip_address: req.socket.localAddress || "",
              log_data: parsedData,
              log_msg: "Return Response",
              mobile: mobile,  
              porderid,
              brand_name: '',
            };

            // Add createdDate
            documentlogs.createdDate = moment().format("YYYY-MM-DD HH:mm:ss");

            // Encrypt mobile
            if (documentlogs?.mobile) {
              documentlogs.mobile = await Piutility.piEncryption(documentlogs.mobile);
            }

            // Process log_data
            if (typeof documentlogs.log_data === "object") {
              documentlogs.log_data = Object.assign({}, documentlogs.log_data);

              // Encrypt mobile if exists in log_data
              if (documentlogs.log_data.mobile) {
                documentlogs.log_data.mobile = await Piutility.piEncryption(documentlogs.log_data.mobile);
              }

              // Stringify for storage
              documentlogs.log_data = JSON.stringify(documentlogs.log_data);
            }

            // Save to FluentBit only in production
            if (process.env.STATUS === "production" || process.env.STATUS === "staging") {
              await dbConnection.query(documentlogs);
            } else {
              exports.wrapper_log("info", JSON.stringify(documentlogs));
            }
          } catch (error) {
            console.log("Erro Occur during log save", error);
          }


      
      // Step 4: Fetch merchant reverse_salt and verify signature
      const [merchant] = await db.query(
        'SELECT reverse_salt FROM Setting WHERE mid = :mid LIMIT 1',
        {
          replacements: { mid: mid },
          type: db.QueryTypes.SELECT
        }
      ); 


      await logDbQuery({
        apiName: 'callbackRecieved',
        logMsg: 'Merchant fetch query result',
        request: {
          params: { mid }
        },
        response: merchant
      });

      if (!merchant) {
        return res.status(404).json({ error: 'Merchant not found' });
      }
      
      
      const r_hash_salt = merchant.reverse_salt;
      const calculatedHash = reverseHashData(JSON.stringify(hashInput), r_hash_salt);
      if (calculatedHash !== reverseHash) {
        console.warn('❌ Hash mismatch - possible spoofed or tampered callback');
        return res.status(403).send('Invalid callback signature. Request rejected.');
      }
      
      // Step 5: Process based on transaction status
      if (status === 'TXN_SUCCESS') {
        try {
          // 5a: Retrieve cart record for this order
          const record = await Cartdetails.findOne({
            where: { porderid: porderid },
            attributes: ['baseUrl', 'shopid']
          });
          const shopId = record.shopid;
          //console.log(shopId);
          // 5b: Fetch Shopify access token
          const merchant = await db.query(
            'SELECT accessToken FROM Setting WHERE shopid = :shopid',
            {
              replacements: { shopid: shopId },
              type: db.QueryTypes.SELECT
            }
          );

          const accessToken = merchant.length > 0 ? merchant[0].accessToken : null;
          const baseUrl = record.baseUrl;
          await logDbQuery({
            apiName: 'callbackRecieved',
            logMsg: 'Get Access token using shop id ',
            request: {
              pid:porderid,
              params: { shopId }
            },
            response: accessToken
          });

          // 5c: Create discount coupon via Shopify API
          const coupon = await createDiscountCoupon(amount, CouponCode, accessToken, baseUrl);
          await logDbQuery({
            apiName: 'callbackRecieved',
            logMsg: 'Create a coupon code ',
            request: {
              pid:porderid,
              params: { amount,CouponCode, accessToken,baseUrl}
            },
            response: coupon
          });
        // console.log('coupon',coupon.data); 
          // 5d: Validate coupon creation response
          if (coupon.message === true && coupon.data && coupon.data.codeDiscountNode) {
            const discountId = coupon.data.codeDiscountNode.id;
            const couponId = discountId.split("/").pop();
            if (discountId) {
              // Update the coupon 
              await Cartdetails.update(
                { CouponCode: CouponCode,
                  status:'TXN_SUCCESS',
                  callback_received: true
                },
                { where: { porderid: porderid } }
              );

              // 5e: Persist coupon code in Cartdetails and GyftrRedeem tables
              await GyftrRedeem.create({
                user_id: null,
                shopify_order_id: null,
                gytr_order_id: porderid,
                coupon_code: CouponCode,
                amount: parsedData.redeemed_amount, //txnAmount,
                refunded: false,
                redeemed_at: new Date(),
                mid:mid,
                requestid:null,
                coupon_id:couponId
              }); 

              // 5f: Insert  Shopifycoupon  details for delete coupon  

              // await ShopifyCoupon.create({
              //   coupon_code:CouponCode,
              //   gyftr_pre_orderid:porderid,
              //   coupon_id:couponId,
              //   used:false,
              //   mid:mid
              // })
              
              // 5g: Redirect customer to cart with success params
              //console.log('Coupnsss - ', CouponCode);
            const token_amount = parsedData.redeemed_amount;
                //console.log('token_amount',token_amount);
              const encodedcoupon = Buffer.from(CouponCode).toString('base64');
              const encodedcouponid = Buffer.from(couponId).toString('base64');
              const successUrl = `${baseUrl}/cart?gyfter=true&error=false&coupon=${encodedcoupon}&orderid=${porderid}&amount=${token_amount}&id=${encodedcouponid}`;
              await logDbQuery({
                apiName: 'callbackRecieved',
                logMsg: 'Coupon Create and redirect to cart page with success message ',
                request: {
                  pid:porderid,
                  params: { encodedcoupon,token_amount,encodedcouponid}
                },
                response: successUrl
              });
              return res.redirect(successUrl);

            }
          } else {
            const baseUrl = record?.baseUrl
            const failUrl = `${baseUrl}/cart?gyfter=false&error=true&message=${encodeURIComponent("Missing discount ID")}`;
            await logDbQuery({
              apiName: 'callbackRecieved',
              logMsg: 'Coupon Create and redirect to cart page with fail message ',
              request: {
                pid:porderid,
              },
              response: failUrl
            });
            return res.redirect(failUrl);
          }
        } catch (err) {
          console.error('Coupon creation failed:', err);
          const baseUrl = record?.baseUrl
          const failUrl = `${baseUrl}/cart?gyfter=false&error=true&message=${err}`;
          return res.redirect(failUrl);
        }


        // Step 6: Handle other statuses (e.g., TXN_CANCELED)
      } else if (status === 'TXN_CANCELED') {

        const parsedData = phpUnserialize.unserialize(inputData);
        const porderid = parsedData.porderid;
        const record = await Cartdetails.findOne({
            where: { porderid: porderid },
            attributes: ['baseUrl', 'shopid']
          });
        const baseUrl = record?.baseUrl
        const failUrl = `${baseUrl}/cart?gyfter=false&error=true&message=Transaction Cancelled`;
        await logDbQuery({
          apiName: 'callbackRecieved',
          logMsg: 'Txn Canceled',
          request: {
            pid:porderid,
          },
          response: failUrl
        }); 
        return res.redirect(failUrl); 
        console.log(`Transaction ${porderid} was successful for ${mobile}.`);
      } else {
        console.log(`Unhandled status: ${status}`);
      }

      //res.send('Payment response received. Thank you!');
    } catch (error) {
      console.error('Error parsing callback:', error);
      res.status(500).send('Error processing payment response.');
    }
  };







