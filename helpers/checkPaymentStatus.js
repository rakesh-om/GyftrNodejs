const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const API_URL = process.env.API_BASE_URL;

/**
 * Check GyFTR Payment Status
 * @param {Object} payload - Object containing MID, TID, SOURCE, and PORDERID
 * @returns {Object} - Parsed response from GyFTR
 */
const checkPaymentStatus = async (payload,userId,password) => {
  try {
    const encryptedData = encrypt(JSON.stringify(payload));

    const headers = {
      'Content-Type': 'application/json',
      'userId': userId,  
      'password': password 
    };

    const response = await axios.post(
      `${process.env.API_BASE_URL}/paymentStatus`,
      { data: encryptedData },
      { headers }
    );

    const decryptedData = decrypt(response.data.data);
    const parsed = JSON.parse(decryptedData);

    // ✅ Wrap the parsed response inside a structure
    return {
      success: true,
      data: parsed
    };

  } catch (err) {
    console.error('❌ checkPaymentStatus error:', err.message || err);
    throw new Error('Failed to fetch payment status');
  }
};

module.exports = checkPaymentStatus;
