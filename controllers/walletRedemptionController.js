const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const GyftrRedemptions = require('../models/GyftrRedemptions'); // DB Model

const GYFTR_USERID = process.env.GYFTR_USERID;
const GYFTR_PASSWORD = process.env.GYFTR_PASSWORD;
const GYFTR_REDEEM_URL = process.env.GYFTR_REDEEM_URL || process.env.GYFTR_TEST_URL;

function validateRequest(body) {
  const required = ['MOBILE', 'MID', 'PORDERID', 'AMOUNT', 'OTP', 'SOURCE', 'BILLNO', 'BILLVALUE'];
  const missing = required.filter(k => !body[k] || String(body[k]).trim() === '');
  return { ok: missing.length === 0, missing };
}

// DB duplicate check
async function isOrderUnique(PORDERID) {
  const exists = await GyftrRedemptions.findOne({ where: { requestid: PORDERID } });
  return !exists;
}

const walletRedemption = async (req, res) => {
  try {
    console.log(" /wallet-redemption request received");

    const headerUserid = req.headers['userid'] || GYFTR_USERID;
    const headerPassword = req.headers['password'] || GYFTR_PASSWORD;

    if (!headerUserid || !headerPassword) {
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

    const isUnique = await isOrderUnique(body.PORDERID);
    if (!isUnique) {
      return res.status(409).json({ message: "Duplicate PORDERID exists. Redemption not allowed." });
    }

    const plainPayload = {
      MOBILE: String(body.MOBILE),
      MID: String(body.MID),
      TID: String(body.TID),
      EREFNO: String(body.EREFNO),
      PORDERID: String(body.PORDERID),
      AMOUNT: String(body.AMOUNT),
      OTP: String(body.OTP),
      SOURCE: String(body.SOURCE),
      BILLNO: String(body.BILLNO),
      BILLVALUE: String(body.BILLVALUE)
    };

    console.log("📝 Plain Payload:", plainPayload);
    const encryptedString = encrypt(JSON.stringify(plainPayload));

    const response = await axios.post(GYFTR_REDEEM_URL, { data: encryptedString }, {
      headers: {
        Userid: headerUserid,
        Password: headerPassword,
        "Content-Type": "application/json"
      },
      timeout: 20000
    });

    const respData = response.data;
    if (!respData?.data) {
      return res.status(502).json({ message: "Invalid GyFTR response", respData });
    }

    const decrypted = decrypt(respData.data, GYFTR_KEY, GYFTR_IV);
    const parsed = JSON.parse(decrypted);

    const code = parsed.CODE;
    const message = parsed.MESSAGE ?? "";

    if (code === "00") {
      // 🔥 SUCCESS — SAVE TO DB
      await GyftrRedemptions.create({
        mobile: parsed.MOBILE,
        gytr_order_id: parsed.TXNID,
        coupon_code: parsed.COUPONCODE,
        coupon_id: parsed.COUPONID,
        amount: parsed.AMOUNT,
        mid: parsed.MID,
        requestid: parsed.PORDERID,
        redeemed_at: new Date()
      });

      console.log("Redemption logged in DB");
  
       

      return res.status(200).json({
        success: true,
        code,
        message,
        data: parsed
      });
    }
  } catch (err) {
    console.error("walletRedemption error:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.response?.data || err.message
    });
  }
};

module.exports = { walletRedemption };
