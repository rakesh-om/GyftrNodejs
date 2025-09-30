const jwt = require("jsonwebtoken");

//const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key"; // Same key used to sign token
const SECRET_KEY='HoaMuonxMIy2EGanfMExIvHyn68Hhh73buwCINCAO89oJ7V0qexScrpQci1ejT4YISSEjsvJw0feVXq6ZzLzTP5xx5aYQ3ysdkKE1lwcdO21VGVZxa2s2gBKVDEJYy7drrQC70J6q3h54ue9lhWooup0AYx'
// Middleware to verify JWT
exports.verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1]; // Get token after "Bearer "
    const decoded = jwt.verify(token, SECRET_KEY);

    // You can attach shop or any info from JWT to req for controllers
    req.shopFromToken = decoded.shop;

    next(); // token is valid, continue
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};
