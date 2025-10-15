const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const FluentBitLogger = require('../helpers/FluentLogger.js');
const moment = require('moment');
const Piutility = require('../helpers/encdec.js');
const API_URL = process.env.API_BASE_URL;

/**
 * Utility to log refund API request/response to FluentBit
 */
async function logRefundApi({ apiName, logMsg, porderid, request, response }) {
  try {
    const dbConnection = new FluentBitLogger();

    let documentlogs = {
      api_name: apiName || "refundApi",
      log_msg: logMsg || "Refund API call",
      porderid: porderid || '',
      createdDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      log_data: {
        request,
        response
      }
    };

    // Optional: encrypt mobile if it exists
    if (documentlogs.log_data?.request?.mobile) {
      documentlogs.log_data.request.mobile = await Piutility.piEncryption(
        documentlogs.log_data.request.mobile
      );
    }
    if (documentlogs.log_data?.response?.mobile) {
      documentlogs.log_data.response.mobile = await Piutility.piEncryption(
        documentlogs.log_data.response.mobile
      );
    }

    // stringify before saving
    documentlogs.log_data = JSON.stringify(documentlogs.log_data);

    // Save to FluentBit (only in production/staging)
    if (process.env.STATUS === "production" || process.env.STATUS === "staging") {
      await dbConnection.query(documentlogs);
    } else {
      console.log("🧾 [LOG]", JSON.stringify(documentlogs, null, 2));
    }
  } catch (error) {
    console.error("⚠️ Failed to log refund API data:", error);
  }
}

/**
 * Check GyFTR Payment Status
 * @param {Object} payload - Object containing MID, TID, SOURCE, and PORDERID
 * @returns {Object} - Parsed response from GyFTR
 */
const checkPaymentStatus = async (payload, userId, password, key, iv,porderid) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'userId': userId,
      'password': password
    };

    const encryptedData = encrypt(JSON.stringify(payload), key, iv);
    console.log('🔐 Encrypted payload for /paymentStatus:', encryptedData);

    // Log request before calling API
    await logRefundApi({
      apiName: 'checkPaymentStatus',
      logMsg: 'Refund API request initiated',
      porderid:porderid,
      request: { payload},
      response: { api_url: `${API_URL}/paymentStatus` }
    });

    const response = await axios.post(
      `${API_URL}/paymentStatus`,
      { data: encryptedData },
      { headers }
    );

    const encryptedResponse = response.data?.data;
    console.log('📦 Raw encrypted response from API:', encryptedResponse);

    if (!encryptedResponse) {
      console.error('❌ API response is missing "data" field.');
      await logRefundApi({
        apiName: 'checkPaymentStatus',
        logMsg: 'Empty response from GyFTR',
        porderid:porderid,
        request: { payload },
        response: { error: 'Missing data field' }
      });
      throw new Error('Empty or invalid response from paymentStatus API');
    }

    const decryptedData = decrypt(response.data.data, key, iv);
    console.log('🔓 Decrypted response:', decryptedData);

    if (!decryptedData || decryptedData.trim() === '') {
      console.error('❌ Decrypted response is empty.');
      await logRefundApi({
        apiName: 'checkPaymentStatus',
        logMsg: 'Decrypted response empty',
        porderid:porderid,
        request: { payload },
        response: { decryptedData }
      });
      throw new Error('Decrypted response is empty or invalid');
    }

    // Try to parse decrypted JSON
    let parsed;
    try {
      parsed = JSON.parse(decryptedData);
    } catch (err) {
      console.error('❌ Failed to parse decrypted JSON:', decryptedData);
      await logRefundApi({
        apiName: 'checkPaymentStatus',
        logMsg: 'Failed to parse decrypted JSON',
        porderid:porderid,
        request: { payload },
        response: { decryptedData }
      });
      throw new Error('Invalid JSON in decrypted response');
    }

    // ✅ Log successful decrypted response
    await logRefundApi({
      apiName: 'checkPaymentStatus',
      logMsg: 'Refund API successful response',
      porderid:porderid,
      request: { payload },
      response: parsed
    });

    // Return parsed data
    return {
      success: true,
      data: parsed
    };

  } catch (err) {
    console.error('❌ checkPaymentStatus error:', err.message || err);

    // Log the error to FluentBit
    await logRefundApi({
      apiName: 'checkPaymentStatus',
      logMsg: 'Refund API error occurred',
      porderid:porderid,
      request: { payload },
      response: { error: err.message || err.toString() }
    });

    throw new Error('Failed to fetch payment status');
  }
}; 

module.exports = checkPaymentStatus;
