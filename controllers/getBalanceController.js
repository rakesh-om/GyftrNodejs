// /controllers/getBalanceController.js
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');

// GyFTR credentials and API info (keep in env variables ideally)
const GYFTR_USERID = process.env.GYFTR_USERID || 'your_userid';
const GYFTR_PASSWORD = process.env.GYFTR_PASSWORD || 'your_password';
const GYFTR_API_URL = process.env.GYFTR_API_URL || 'https://gyfter.example.com/getWalletBalance';
const GYFTR_KEY = process.env.GYFTR_KEY || 'mvPjj93b78BOuupjmETBBY6yrQGhbizC'; // 32-byte
const GYFTR_IV = process.env.GYFTR_IV || '9660064408704604'; // 16-byte

// Controller to get wallet balance
exports.getWalletBalance = async (req, res) => {
  try {
    const { MOBILE, MID, TID, EREFNO } = req.body;

    // Validate required parameters
    if (!MOBILE || !MID || !TID) {
      return res.status(400).json({ error: 'MOBILE, MID and TID are required' });
    }

    // Create payload and encrypt
    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO });
    const encryptedPayload = { data: encrypt(payload, GYFTR_KEY, GYFTR_IV) };

    // Call GyFTR API
    const response = await axios.post(GYFTR_API_URL, encryptedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Userid': GYFTR_USERID,
        'Password': GYFTR_PASSWORD
      }
    });

    // Decrypt GyFTR response
    const decryptedData = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    const parsed = JSON.parse(decryptedData);

    // Send response to frontend
    return res.json({
      code: parsed.CODE,
      message: parsed.MESSAGE,
      balance: parsed.BALANCE
    });

  } catch (err) {
    console.error('Get Wallet Balance Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};
