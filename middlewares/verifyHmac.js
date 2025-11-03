const crypto = require("crypto");

const verifyHmac = (req, res, next) => {
  try {
    const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
    const body = JSON.stringify(req.body);
    const secret = process.env.SHOPIFY_API_SECRET;

    const hash = crypto.createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("base64");

    const valid = crypto.timingSafeEqual(
      Buffer.from(hash, "utf8"),
      Buffer.from(hmacHeader, "utf8")
    );

    if (!valid) {
      console.error("❌ Invalid HMAC. Request rejected.");
      return res.status(401).send("Invalid HMAC");
    }

    console.log("✅ HMAC verified successfully");
    next();
  } catch (error) {
    console.error("❌ HMAC verification failed:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = verifyHmac;
