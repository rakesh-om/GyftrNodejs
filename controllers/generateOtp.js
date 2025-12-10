const axios = require("axios");
const { encrypt, decrypt } = require("../utils/gyftrCrypto");

const GYFTR_KEY = process.env.GYFTR_KEY;
const GYFTR_IV = process.env.GYFTR_IV;

exports.generateOtp = async (req, res) => {
  try {
    const { MOBILE, MID, TID, EREFNO } = req.body;
    const userid = req.headers.userid;
    const password = req.headers.password;

    console.log("Userid:", userid);
    console.log("Password:", password);

    // Validate required headers
    if (!userid || !password) {
      return res.status(400).json({
        error: "Missing required headers: userid, password"
      });
    }

    // Validate body parameters
    if (!MOBILE || !MID || !TID) {
      return res.status(400).json({
        error: "Missing required fields: MOBILE, MID, TID"
      });
    }


    // Create payload
    const payload = JSON.stringify({
      MOBILE,
      MID,
      TID,
      EREFNO: EREFNO || ""
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
        'userid':  userid,
        'password':   password
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
    console.log("GYFTR_KEY:", GYFTR_KEY);
    console.log("GYFTR_IV:", GYFTR_IV);

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
