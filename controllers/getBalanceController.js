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
  console.log("🔥 Request Received at /get-balance");

  try {
    const { MOBILE, MID, TID, EREFNO } = req.body;

    // Validate required parameters
    if (!MOBILE || !MID || !TID) {
      return res.status(400).json({ error: 'MOBILE, MID and TID are required' });
    }

    EREFNO = EREFNO || Date.now().toString();

    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO });
    const encryptedPayload = { data: encrypt(payload, GYFTR_KEY, GYFTR_IV) };

    // Call GyFTR API
    const response = await axios.post(GYFTR_API_URL, encryptedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'userid':userid,
        'password':password
      }
    });

    console.log("📩 Raw Encrypted Response:", response.data);

    const decryptedData = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    const parsed = JSON.parse(decryptedData);

    console.log('Parsed Response:', parsed);

    const balance = parsed.BALANCE;
    console.log('Wallet Balance:', balance);

   await Balance.upsert({ userId: userid, balance: balance });

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


function validateRequest(body) {
  const required = ['MOBILE', 'MID', 'PORDERID', 'AMOUNT', 'OTP', 'SOURCE', 'BILLNO', 'BILLVALUE'];
  const missing = required.filter(k => !body[k] || String(body[k]).trim() === '');
  return { ok: missing.length === 0, missing };
}
 
// DB duplicate check
// async function isOrderUnique(PORDERID) {
//   const exists = await GyftrRedemptions.findOne({ where: { requestid: PORDERID } });
//   return !exists;
// }
 
exports.walletRedemption = async (req, res) => {
  try {
    console.log(" /wallet-redemption request received");
 
    const {userid, password} = req.headers;

     const { MOBILE, MID, TID, EREFNO ,PORDERID, AMOUNT, OTP, SOURCE, BILLNO, BILLVALUE} = req.body;
     
    if (!userid || !password) {
      return res.status(400).json({ message: "Userid/Password missing" });
    }
    
 
    const body = req.body;
 
    if (!body.TID) body.TID = `TID${Date.now()}`;
    if (!body.EREFNO) body.EREFNO = Date.now().toString();
 
    const { ok, missing } = validateRequest(body);
    if (!ok) return res.status(400).json({ message: "Missing required params", missing });
 
    const amt = parseFloat(body.AMOUNT);
    if (isNaN(amt)) return res.status(400).json({ message: "Invalid amount" });
    body.AMOUNT = amt.toFixed(2);
 
    // const isUnique = await isOrderUnique(body.PORDERID);
    // if (!isUnique) {
    //   return res.status(409).json({ message: "Duplicate PORDERID exists. Redemption not allowed." });
    // }
 
    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO, PORDERID, AMOUNT, OTP, SOURCE, BILLNO, BILLVALUE });
 
    console.log("Plain Payload:", payload);
    const encryptedString = encrypt(payload , GYFTR_KEY, GYFTR_IV);
    console.log("🔐 Encrypted Payload:", encryptedString);
 
    const response = await axios.post("https://brandpts.gyftr.net/api/merchant-services/getWalletBalance", { data: encryptedString }, {
      headers: {
        "Userid": userid,
        "Password": password,
        "Content-Type": "application/json"
      },
      // timeout: 20000
    });
 
    const respData = response.data;
    if (!respData?.data) {
      return res.status(502).json({ message: "Invalid GyFTR response", respData });
    }
 
    const decrypted = decrypt(respData.data, GYFTR_KEY, GYFTR_IV);
    const parsed = JSON.parse(decrypted);
 
    const code = parsed.CODE;
    const message = parsed.MESSAGE ?? "";
 
    
    // if (code === "00") {
    //   // 🔥 SUCCESS — SAVE TO DB
    //   await GyftrRedemptions.create({
    //     mobile: parsed.MOBILE,
    //     gytr_order_id: parsed.TXNID,
    //     coupon_code: parsed.COUPONCODE,
    //     coupon_id: parsed.COUPONID,
    //     amount: parsed.AMOUNT,
    //     mid: parsed.MID,
    //     requestid: parsed.PORDERID,
    //     redeemed_at: new Date()
    //   });
 
    //   console.log("✅ Redemption logged in DB");
 
    //   return res.status(200).json({
    //     success: true,
    //     code,
    //     message,
    //     data: parsed
    //   });
    // }
 
return res.status(200).json({
      success: code === "00",
      code,
      message,
      data: parsed
    }); 
  } catch (err) {
    console.error("❌ walletRedemption error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.response?.data || err.message
    });
  }
};
 
 
 