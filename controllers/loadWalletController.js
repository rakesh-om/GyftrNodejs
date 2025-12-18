const axios = require("axios");
const { encrypt, decrypt } = require("../utils/gyftrCrypto");

const GYFTR_KEY = process.env.GYFTR_KEY || "mvPjj93b78BOuupjmETBBY6yrQGhbizC"; // 32-byte
const GYFTR_IV = process.env.GYFTR_IV || "9660064408704604"; // 16-byte

exports.loadWallet = async (req, res) => {
  try {
    const { MOBILE, MID, TID, OTP, SOURCE } = req.body;
    console.log("Body:", req.body);
    const { userid, password } = req.headers;
    console.log("Userid", userid);
    console.log("Password", password);

    
    if (!userid || !password) {
      return res
        .status(400)
        .json({ error: "Missing required headers: userid, password" });
    }

    // Validate required parameters
    if (!MOBILE || !MID || !TID || !OTP || !SOURCE) {
      return res.status(400).json({
        error: "Missing required fields: MOBILE, MID, TID, OTP, SOURCE",
      });
    }

    // Payload
    const payload = JSON.stringify({
      MOBILE,
      MID,
      TID,
      OTP,
      SOURCE,
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
