const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const Balance = require('../models/Balance');

const GYFTR_USERID = process.env.GYFTR_USERID;
const GYFTR_PASSWORD = process.env.GYFTR_PASSWORD;
const GYFTR_API_URL = process.env.GYFTR_TEST_URL;
const GYFTR_KEY = process.env.GYFTR_KEY;
const GYFTR_IV = process.env.GYFTR_IV;
console.log("🔍 ENV DEBUG CHECK:");
console.log("➡️ GYFTR_USERID:", process.env.GYFTR_USERID ? "Loaded ✔️" : "❌ Missing");
console.log("➡️ GYFTR_PASSWORD:", process.env.GYFTR_PASSWORD ? "Loaded ✔️" : "❌ Missing");
console.log("➡️ GYFTR_API_URL:", process.env.GYFTR_TEST_URL);
console.log("➡️ GYFTR_KEY:", process.env.GYFTR_KEY ? "***MASKED***" : "❌ Missing");
console.log("➡️ GYFTR_IV:", process.env.GYFTR_IV ? "***MASKED***" : "❌ Missing");

exports.getWalletBalance = async (req, res) => {
  console.log("🔥 Request Received at /get-balance");

  try {
    let { MOBILE, MID, TID, EREFNO } = req.body;

    if (!MOBILE || !MID || !TID) {
      return res.status(400).json({ error: 'MOBILE, MID and TID are required' });
    }

    EREFNO = EREFNO || Date.now().toString();

    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO });
    console.log("📝 Raw Payload:", payload);

    const encryptedPayload = { data: encrypt(payload) };
    console.log("🔐 Encrypted Payload:", encryptedPayload);

    const response = await axios.post(GYFTR_API_URL, encryptedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Userid': GYFTR_USERID,
        'Password': GYFTR_PASSWORD
      }
    });

    console.log("📩 Raw Encrypted Response:", response.data);

    const decryptedData = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    console.log("🔓 Decrypted Response:", decryptedData);

    const parsed = JSON.parse(decryptedData);

    if (parsed.BALANCE !== undefined) {
      await Balance.upsert({
        shop: MID,
        remaining_balance: parseFloat(parsed.BALANCE)
      });
    }

    return res.json({
      code: parsed.CODE,
      message: parsed.MESSAGE,
      balance: parsed.BALANCE
    });

  } catch (err) {
    console.error('❌ Get Wallet Balance Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};
