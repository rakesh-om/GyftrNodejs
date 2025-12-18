// /controllers/getBalanceController.js
const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const { Balance } = require('../models/Balance');
const Setting = require('../models/Setting');
const { generatePORDERID } = require('../helpers/generatePorderId');

const GYFTR_USERID = process.env.GYFTR_USERID || 'your_userid';
const GYFTR_PASSWORD = process.env.GYFTR_PASSWORD || 'your_password';
const GYFTR_API_URL = process.env.GYFTR_TEST_URL || 'https://gyfter.example.com/getWalletBalance';
const GYFTR_KEY = process.env.GYFTR_KEY || 'mvPjj93b78BOuupjmETBBY6yrQGhbizC'; // 32-byte
const GYFTR_IV = process.env.GYFTR_IV || '9660064408704604'; // 16-byte
console.log('GYFTR_KEY:', GYFTR_KEY);
console.log('GYFTR_IV:', GYFTR_IV);


exports.getWalletBalance = async (req, res) => {
  try {
    const { SHOP, SHOPID, MOBILE } = req.body;
    
    console.log("Request Body:", req.body);

    // Validate required parameters 
    if (!SHOP || !SHOPID || !MOBILE) {
      return res.status(400).json({ error: 'SHOP, SHOPID and MOBILE are required' });
    }


    // Fetch settings from database
    const setting = await Setting.findOne({
      where: {
        shop: SHOP,
        // shopid: shopId
      }
    });

    console.log("Fetched Setting:", setting);



    if (!setting) {
      return res.status(404).json({ error: 'Shop settings not found' });
    }

    console.log("Setting found:", setting.shop);
     const updateTid = `${setting.brand_name}-${setting.shopid}`;

    // Extract credentials from setting
    const MID = setting.mid;
    const TID = updateTid; // Use updateTid instead of generating a new one
    const EREFNO = Date.now().toString(); // Generate unique EREFNO
    const userid = setting.userId;
    const password = setting.password;
    const GYFTR_KEY = setting.enc_dec_api_key;
    const GYFTR_IV = setting.enc_dec_api_iv_key;

    console.log("Using MID:", MID);
    console.log("Using TID:", TID);
    console.log("Using Userid:", userid);

    // Create payload and encrypt
    const payload = JSON.stringify({ MOBILE: MOBILE, MID, TID, EREFNO });
    console.log('Payload:', payload);
    const encryptedPayload = { data: encrypt(payload, GYFTR_KEY, GYFTR_IV) };
    console.log('Encrypted Payload:', encryptedPayload);

    // Call GyFTR API
    const response = await axios.post("https://brandpts.gyftr.net/api/merchant-services/getWalletBalance", encryptedPayload, {
      headers: {
        'Content-Type': 'application/json',
        'userid': userid,
        'password': password
      }
    });

    // Decrypt GyFTR response
    const decryptedData = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    console.log('Decrypted Data:', decryptedData);
    const parsed = JSON.parse(decryptedData);

    console.log('Parsed Response:', parsed);

    const balance = parsed.BALANCE;
    console.log('Wallet Balance:', balance);

    // Save balance in database with userId
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
  const required = ['MOBILE', 'MID', 'PORDERID', 'AMOUNT', 'SOURCE', 'BILLNO', 'BILLVALUE'];
  const missing = required.filter(k => !body[k] || String(body[k]).trim() === '');
  return { ok: missing.length === 0, missing };
}
 

 
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
 
console.log("Validated Body:", body);

    const amt = parseFloat(body.AMOUNT);
    if (isNaN(amt)) return res.status(400).json({ message: "Invalid amount" });
    body.AMOUNT = amt.toFixed(2);
 
    // const isUnique = await isOrderUnique(body.PORDERID);
    // if (!isUnique) {
    //   return res.status(409).json({ message: "Duplicate PORDERID exists. Redemption not allowed." });
    // }
 
    const payload = JSON.stringify({ MOBILE, MID, TID, EREFNO, PORDERID, AMOUNT, SOURCE, BILLNO, BILLVALUE });
 console.log("🔐 Payload:", payload);
    const encryptedString = encrypt(payload , GYFTR_KEY, GYFTR_IV);
 console.log("🔐 Encrypted Payload:", encryptedString);
    const response = await axios.post("https://brandpts.gyftr.net/api/merchant-services/walletRedemption", { data: encryptedString }, {
      headers: {
        "Userid": userid,
        "Password": password,
        "Content-Type": "application/json"
      },
      // timeout: 20000
    });

    console.log("🔐 Encrypted Response:", response.data);

    const respData = response.data;
    if (!respData?.data) {
      return res.status(502).json({ message: "Invalid GyFTR response", respData });
    }
 
    const decrypted = decrypt(respData.data, GYFTR_KEY, GYFTR_IV);
    console.log("🔓 Decrypted Response:", decrypted);
    
    const parsed = JSON.parse(decrypted);
 
    const code = parsed.CODE;
    const message = parsed.MESSAGE ?? "";

    
 
    

 
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
    const { MOBILE, SHOP, SHOPID, VOUCHERNUMBER } = req.body;

    console.log("Request Body:", req.body);

    // Validate required parameters
    if (!MOBILE || !SHOP || !SHOPID || !VOUCHERNUMBER) {
      return res.status(400).json({
        error: "mobile, shop, shopId and voucherNumber are required",
      });
    }

    // Fetch settings from database
    const setting = await Setting.findOne({
      where: {
        shop: SHOP,
        // shopid: SHOPID
      }
    });

    if (!setting) {
      return res.status(404).json({ error: "Shop settings not found" });
    }

    console.log("Setting found:", setting.shop);

    // Extract credentials from setting
    const MID = setting.mid;
    const TID = `${setting.brand_name}-${setting.shopid}`;
    const PORDERID = generatePORDERID(); // Generate unique PORDERID
    const EREFNO = Date.now().toString(); // Generate unique EREFNO
    const userid = setting.userId;
    const password = setting.password;
    const GYFTR_KEY = setting.enc_dec_api_key;
    const GYFTR_IV = setting.enc_dec_api_iv_key;

    // Static values
    const VOUCHERTYPE = "E";
    const SOURCE = "P";

    console.log("Using MID:", MID);
    console.log("Using TID:", TID);
    console.log("Using PORDERID:", PORDERID);
    console.log("Using Userid:", userid);

    /* ================= PAYLOAD ================= */
    const payload = {
      MOBILE: MOBILE,
      MID,
      TID,
      PORDERID,
      VOUCHERNUMBER: VOUCHERNUMBER,
      VOUCHERTYPE,
      SOURCE,
      EREFNO
    };

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

    console.log("Parsed Response:", parsedResponse);

    /* ================= FINAL RESPONSE ================= */
    return res.json({
      code: parsedResponse.CODE,
      message: parsedResponse.MESSAGE,
      data: parsedResponse,
    });
  } catch (err) {
    console.error("Recharge Wallet Error:", err.message);

    return res.status(500).json({
      error: "Failed to recharge wallet",
      details: err.message,
    });
  }
};
 
 
 
exports.loadWallet = async (req, res) => {
  try {
    const { SHOP, SHOPID, MOBILE, OTP } = req.body;
    
    console.log("Request Body:", req.body);

    // Validate required parameters
    if (!SHOP || !SHOPID || !MOBILE || !OTP) {
      return res.status(400).json({ 
        error: 'SHOP, SHOPID, MOBILE and OTP are required' 
      });
    }

    // Fetch settings from database
    const setting = await Setting.findOne({
      where: {
        shop: SHOP,
        shopid: SHOPID
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Shop settings not found' });
    }

    console.log("Setting found:", setting.shop);

    // Extract credentials from setting
    const MID = setting.mid;
    const TID = `${setting.brand_name}-${setting.shopid}`;
    const EREFNO = Date.now().toString(); // Generate unique EREFNO
    const userid = setting.userId;
    const password = setting.password;
    const GYFTR_KEY = setting.enc_dec_api_key;
    const GYFTR_IV = setting.enc_dec_api_iv_key;
    const SOURCE = "P"; // Default source

    console.log("Using MID:", MID);
    console.log("Using TID:", TID);
    console.log("Using Userid:", userid);

    // Create payload and encrypt
    const payload = JSON.stringify({
      MOBILE: MOBILE,
      MID,
      TID,
      OTP: OTP,
      SOURCE,
      EREFNO,
      SOURCE
    });

    console.log("Payload:", payload);

    // Encrypt
    const encryptedPayload = {
      data: encrypt(payload, GYFTR_KEY, GYFTR_IV),
    };

    console.log("Encrypted Payload:", encryptedPayload);

    // API REQUEST
    const gyfterResponse = await axios.post(
      "https://brandpts.gyftr.net/api/merchant-services/loadWallet",
      encryptedPayload,
      {
        headers: {
          "Content-Type": "application/json",
          userid: userid,
          password: password,
        },
      }
    );

    console.log("Raw GyFTR Response:", gyfterResponse.data);

    if (!gyfterResponse.data || !gyfterResponse.data.data) {
      return res
        .status(500)
        .json({ error: "Invalid encrypted response from GyFTR" });
    }

    // Decrypt response
    const decryptedText = decrypt(
      gyfterResponse.data.data,
      GYFTR_KEY,
      GYFTR_IV
    );

    console.log("Decrypted Response:", decryptedText);

    let parsed;
    try {
      parsed = JSON.parse(decryptedText);
    } catch (e) {
      console.log("Error parsing decrypted text:", e);
      return res
        .status(500)
        .json({ error: "Failed to parse decrypted GyFTR response" });
    }

    console.log("Parsed Response:", parsed);

    return res.json({
      code: parsed.CODE,
      message: parsed.MESSAGE,
      data: parsed,
    });
  } catch (err) {
    console.error("Load Wallet Error:", err.message);

    return res.status(500).json({
      error: "Failed to load wallet",
      details: err.message,
    });
  }
};


