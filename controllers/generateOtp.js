const axios = require("axios");
const { encrypt, decrypt } = require("../utils/gyftrCrypto");
const Setting = require("../models/Setting");

const GYFTR_KEY = process.env.GYFTR_KEY;
const GYFTR_IV = process.env.GYFTR_IV;

exports.generateOtp = async (req, res) => {
  try {
    const { MOBILE, SHOP, SHOPID } = req.body;
    
    console.log("Request Body:", req.body);

    // Validate required parameters
    if (!MOBILE || !SHOP || !SHOPID) {
      return res.status(400).json({
        error: "mobile, shop and shopId are required"
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
    const EREFNO = Date.now().toString(); // Generate unique EREFNO
    const userid = setting.userId;
    const password = setting.password;
    const GYFTR_KEY = setting.enc_dec_api_key;
    const GYFTR_IV = setting.enc_dec_api_iv_key;

    console.log("Using MID:", MID);
    console.log("Using TID:", TID);
    console.log("Using Userid:", userid);

    // Create payload
    const payload = JSON.stringify({
      MOBILE: MOBILE,
      MID,
      TID,
      EREFNO
    });

    console.log("Plain Payload:", payload);

    // Encrypt payload
    const encryptedPayload = {
      data: encrypt(payload, GYFTR_KEY, GYFTR_IV)
    };

    console.log("Encrypted Payload:", encryptedPayload);

    // Hit GyFTR API
    const response = await axios.post(
      "https://brandpts.gyftr.net/api/merchant-services/generateOtp",
      encryptedPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'userid': userid,
          'password': password
        }
      }
    );

    console.log("Raw GyFTR Response:", response.data);

    if (!response.data || !response.data.data) {
      return res.status(500).json({
        error: "Invalid encrypted response from GyFTR"
      });
    }

    // Decrypt response
    const decrypted = decrypt(response.data.data, GYFTR_KEY, GYFTR_IV);
    console.log("Decrypted Response:", decrypted);

    let parsed;
    try {
      parsed = JSON.parse(decrypted);
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return res.status(500).json({
        error: "Failed to parse decrypted GyFTR response"
      });
    }

    console.log("Parsed Response:", parsed);

    // Return final response
    return res.json({
      code: parsed.CODE,
      message: parsed.MESSAGE,
      data: parsed
    });

  } catch (err) {
    console.error("Generate OTP Error:", err.message);
    return res.status(500).json({
      error: "Failed to generate OTP",
      details: err.message
    });
  }
};
