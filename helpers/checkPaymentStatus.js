const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const API_URL = process.env.API_BASE_URL;

/**
 * Check GyFTR Payment Status
 * @param {Object} payload - Object containing MID, TID, SOURCE, and PORDERID
 * @returns {Object} - Parsed response from GyFTR
 */
const checkPaymentStatus = async (payload, userId, password, key, iv) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'userId': userId,
      'password': password
    };

    // Ensure key and IV are strings
    const keyStr = typeof key === 'string' ? key : key.toString();
    const ivStr = typeof iv === 'string' ? iv : iv.toString();

    // Encrypt the request payload
    const encryptedData = encrypt(JSON.stringify(payload), keyStr, ivStr);
    console.log('🔐 Encrypted payload for /paymentStatus:', encryptedData);

    // Make the API request
    const response = await axios.post(
      `${API_URL}/paymentStatus`,
      { data: encryptedData },
      { headers }
    );

    const encryptedResponse = response.data?.data;
    console.log('📦 Raw encrypted response from API:', encryptedResponse);

    if (!encryptedResponse) {
      console.error('❌ API response is missing "data" field.');
      throw new Error('Empty or invalid response from paymentStatus API');
    }

    // Decrypt the response
    const decryptedData = decrypt(encryptedResponse, keyStr, ivStr);
    console.log('🔓 Decrypted response:', decryptedData);

    if (!decryptedData || decryptedData.trim() === '') {
      console.error('❌ Decrypted response is empty.');
      throw new Error('Decrypted response is empty or invalid');
    }

    // Parse the decrypted JSON
    let parsed;
    try {
      parsed = JSON.parse(decryptedData);
    } catch (err) {
      console.error('❌ Failed to parse decrypted JSON:', decryptedData);
      throw new Error('Invalid JSON in decrypted response');
    }

    // ✅ Return successful result
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
