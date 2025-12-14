const axios = require('axios');
const { encrypt, decrypt } = require('../utils/gyftrCrypto');
const {createGiftCard, applyGiftCart } = require('../controllers/giftcard');  

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

   await Balance.upsert({ userid: userid, balance: balance });

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


    if (code === "00") {
  const giftAmount = parsed.AMOUNT;
  const cartId = req.body.cartId;

  if (!cartId) {
    return res.status(400).json({
      success: false,
      message: "cartId is required to apply gift card"
    });
  }

  const admin = req.shopifyAdmin;

  const giftCard = await createGiftCard(
    admin,
    giftAmount,
    `GyFTR wallet redemption - ${parsed.TXNID}`
  );

  // 2️⃣ Apply Gift Card to CART
  const cart = await applyGiftCart({
    cartId,
    giftCardCode: giftCard.code
  });

  return res.status(200).json({
    success: true,
    message: "Wallet redeemed & gift card applied to cart",
    giftCard: {
      code: giftCard.code,
      amount: giftAmount
    },
    cart
  });
}

 
 
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




// exports.applyGiftCart = async (req, res) => {
  
 
//   try {
//     console.log("➡ Applying Gift Card...");

//     const { cartId, giftCardCode } = req.body;

//     if (!cartId || !giftCardCode) {
//       return res.status(400).json({
//         success: false,
//         message: "cartId and giftCardCode are required",
//       });
//     }

//     // Shopify Storefront Access Token
//     const STOREFRONT_TOKEN = "32ef2e8324437b946d64b55405ae55ce";

//     // Shopify Store Domain
//     const SHOP_DOMAIN = "gyft-staging.myshopify.com";

//     // GraphQL Mutation
//     const query = `
//       mutation cartGiftCardCodesAdd($cartId: ID!, $giftCardCodes: [String!]!) {
//         cartGiftCardCodesAdd(cartId:$cartId, giftCardCodes:$giftCardCodes) {
//           cart {
//             id
//             appliedGiftCards {
//               lastCharacters
//               amountUsed { amount currencyCode }
//             }
//             cost {
//               totalAmount { amount currencyCode } 
//             }
//           }
//           userErrors { field message }
//         }
//       }
//     `;

//     const variables = {
//       cartId,
//       giftCardCodes: [giftCardCode],
//     };

//     const response = await fetch(
//       `https://${SHOP_DOMAIN}/api/2025-10/graphql.json`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
//         },
//         body: JSON.stringify({
//           query,
//           variables,
//         }),
//       }
//     );

//     const data = await response.json();
//       console.log("Response from backend:", data);


//     console.log("🛒 Shopify Response:", JSON.stringify(data));

//     return res.status(200).json({
//       success: true,
//       data,
//     });

//   } catch (error) {
//     console.error("❌ Error in applyGiftCart:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

 
 
 