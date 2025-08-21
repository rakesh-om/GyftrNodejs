// middlewares/validateShop.js
module.exports = function validateShop(req, res, next) {
  const shop = req.query?.shop || req.headers['x-forwarded-host'];

  // Check if shop is present and is a valid myshopify domain
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return res.status(400).json({ error: 'Invalid or missing shop domain' });
  }

  // Attach shop to request object for further use
  req.shopDomain = shop;

  // Proceed to the next middleware/controller
  next();
};
