const axios = require("axios");
const { encrypt, decrypt } = require("../utils/gyftrCrypto");
const { validateRequest } = require("../helpers/validateRequest");
const { generatePORDERID } = require("../helpers/generatePorderId");

const GYFTR_URL =
  "https://brandpts.gyftr.net/api/merchant-services/walletRedemption";

exports.callGyftrWallet = async (creds, body) => {
  const { userid, password, key, iv } = creds;

  const { ok, missing } = validateRequest(body);
  if (!ok) throw new Error(`Missing params: ${missing.join(", ")}`);

  body.AMOUNT = parseFloat(body.AMOUNT).toFixed(2);

  const payload = JSON.stringify({
    MOBILE: body.MOBILE,
    MID: body.MID,
    TID: body.TID || `TID${Date.now()}`,
    EREFNO: body.EREFNO || Date.now().toString(),
    PORDERID: generatePORDERID(),
    AMOUNT: body.AMOUNT,
    SOURCE: body.SOURCE,
    BILLNO: body.BILLNO,
    BILLVALUE: body.BILLVALUE,
  });

  const encrypted = encrypt(payload, key, iv);

  const response = await axios.post(
    GYFTR_URL,
    { data: encrypted },
    {
      headers: {
        Userid: userid,
        Password: password,
        "Content-Type": "application/json",
      },
    }
  );

  const decrypted = decrypt(response.data.data, key, iv);
  return JSON.parse(decrypted);
};
