const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const API_URL = process.env.API_BASE_URL;

/**
 * Check GyFTR Payment Status
 * @param {Object} payload - Object containing MID, TID, SOURCE, and PORDERID
 * @returns {Object} - Parsed response from GyFTR
 */
const checkPaymentStatus = async (payload,userId,password,key,iv) => {
  try {
    
     const headers = {
      'Content-Type': 'application/json',
      'userId': userId,  
      'password': password
    };

    const encryptedData = encrypt(JSON.stringify(payload), key, iv);
   console.log('🔐 Encrypted payload for /paymentStatus:', encryptedData);
    const response = await axios.post(
      `${process.env.API_BASE_URL}/paymentStatus`,
      { data: encryptedData },
      { headers }
    );
       const encryptedResponse = response.data?.data;
    console.log('📦 Raw encrypted response from API:', encryptedResponse);
    if (!encryptedResponse) {
      console.error('❌ API response is missing "data" field.');
      throw new Error('Empty or invalid response from paymentStatus API');
    }

    const decryptedData = decrypt(response.data.data, key, iv);
    console.log('🔓 Decrypted response:', decryptedData);
    if (!decryptedData || decryptedData.trim() === '') {
      console.error('❌ Decrypted response is empty.');
      throw new Error('Decrypted response is empty or invalid');
    }

//    const parsed = JSON.parse(decryptedData);


     // Parse the decrypted JSON
    let parsed;
    try {
      parsed = JSON.parse(decryptedData);
    } catch (err) {
      console.error('❌ Failed to parse decrypted JSON:', decryptedData);
      throw new Error('Invalid JSON in decrypted response');
    }
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
