// /controllers/getBalanceController.js
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const { Balance } = require('../models/Balance');

const GYFTR_USERID = process.env.GYFTR_USERID || 'your_userid';
const GYFTR_PASSWORD = process.env.GYFTR_PASSWORD || 'your_password';
const GYFTR_API_URL = process.env.GYFTR_TEST_URL || 'https://gyfter.example.com/getWalletBalance';
const GYFTR_KEY = process.env.GYFTR_KEY || 'mvPjj93b78BOuupjmETBBY6yrQGhbizC'; // 32-byte
const GYFTR_IV = process.env.GYFTR_IV || '9660064408704604'; // 16-byte
console.log('GYFTR_KEY:', GYFTR_KEY);
console.log('GYFTR_IV:', GYFTR_IV);


exports.getWalletBalance = async (req, res) => {
  try {
    const { MOBILE, MID, TID, EREFNO } = req.body;
    const {userid, password} = req.headers;
    console.log("Userid",userid)
    console.log("Password",password)

    // Validate required parameters 

    if (!MOBILE || !MID || !TID) {
      return res.status(400).json({ error: 'MOBILE, MID and TID are required' });
    }

    // Create payload and encrypt
    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO });
    console.log('Payload:', payload);
    const encryptedPayload = { data: encrypt(payload , GYFTR_KEY, GYFTR_IV)  };
  console.log('Encrypted Payload:', encryptedPayload);
  

    // Call GyFTR API
    const response = await axios.post("https://brandpts.gyftr.net/api/merchant-services/getWalletBalance", encryptedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'userid':userid,
        'password':password
      }
    });

    // Decrypt GyFTR response
    const decryptedData = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    console.log('Decrypted Data:', decryptedData);
    const parsed = JSON.parse(decryptedData);

    console.log('Parsed Response:', parsed);

    const balance = parsed.BALANCE;
    console.log('Wallet Balance:', balance);

   await Balance.upsert({ userId: userid, balance: balance });

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

     const { MOBILE, MID, TID, EREFNO ,PORDERID, AMOUNT, SOURCE, BILLNO, BILLVALUE} = req.body;
     
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
 
    const encryptedString = encrypt(payload , GYFTR_KEY, GYFTR_IV);
 
    const response = await axios.post("https://brandpts.gyftr.net/api/merchant-services/walletRedemption", { data: encryptedString }, {
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
    console.log("🔓 Decrypted Response:", decrypted);
    
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


exports.rechargeWallet = async (req, res) => {
  try {
    console.log("EPAY Recharge Body:", req.body);

    const {
      MOBILE,
      MID,
      TID,
      PORDERID,
      EREFNO,
      VOUCHERNUMBER,
      VOUCHERTYPE,
      OTP,
      SOURCE,
    } = req.body;

    const { userid, password } = req.headers;

    console.log("Userid:", userid);
    console.log("Password:", password);

    /* ================= HEADER VALIDATION ================= */
    if (!userid || !password) {
      return res.status(400).json({
        error: "Missing required headers: userid, password",
      });
    }

    /* ================= BODY VALIDATION ================= */
    if (!MOBILE || !MID || !TID || !PORDERID || !VOUCHERNUMBER || !VOUCHERTYPE || !SOURCE) {
      return res.status(400).json({
        error:
          "Missing required fields: MOBILE, MID, TID, PORDERID, VOUCHERNUMBER, VOUCHERTYPE, SOURCE",
      });
    }

    // OTP mandatory only for P / E voucher types
    if ((VOUCHERTYPE === "P" || VOUCHERTYPE === "E") && !OTP) {
      return res.status(400).json({
        error: "OTP is required for voucher type P or E",
      });
    }

    /* ================= PAYLOAD ================= */
    const payload = {
      MOBILE,
      MID,
      TID,
      PORDERID,
      VOUCHERNUMBER,
      VOUCHERTYPE,
      SOURCE,
    };
    

    if (EREFNO) payload.EREFNO = EREFNO;
    if (OTP) payload.OTP = OTP;

    console.log("Plain Payload:", payload);

    /* ================= ENCRYPT ================= */
    const encryptedPayload = {
      data: encrypt(JSON.stringify(payload), GYFTR_KEY, GYFTR_IV),
    };

    console.log("Encrypted Payload:", encryptedPayload);

    /* ================= API CALL ================= */
    const gyfterResponse = await axios.post(
      "https://brandpts.gyftr.net/api/merchant-services/rechargeWallet",
      encryptedPayload,
      {
        headers: {
          "Content-Type": "application/json",
          userid,
          password,
        },
      }
    );

    console.log("Raw GyFTR Response:", gyfterResponse.data);

    if (!gyfterResponse.data || !gyfterResponse.data.data) {
      return res.status(500).json({
        error: "Invalid encrypted response from GyFTR",
      });
    }

    /* ================= DECRYPT ================= */
    const decryptedText = decrypt(
      gyfterResponse.data.data,
      GYFTR_KEY,
      GYFTR_IV
    );

    console.log("Decrypted Response:", decryptedText);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(decryptedText);
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return res.status(500).json({
        error: "Failed to parse decrypted GyFTR response",
      });
    }

    /* ================= FINAL RESPONSE ================= */
    return res.json({
      code: parsedResponse.CODE,
      message: parsedResponse.MESSAGE,
      data: parsedResponse,
    });
  } catch (err) {
    console.error("EPAY Recharge Error:", err.message);

    return res.status(500).json({
      error: "Failed to recharge wallet",
      details: err.message,
    });
  }
};
 
 
 