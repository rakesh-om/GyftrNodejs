const fetch = require("node-fetch");
 const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
    console.log("🚀 ~ SHOP_DOMAIN:", SHOP_DOMAIN)
    const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;
    console.log("🚀 ~ STOREFRONT_TOKEN:", STOREFRONT_TOKEN)
// ✅ Apply Gift Card (POST)
exports.applyGiftCart = async (req, res) => {
  try {
    console.log("➡ Applying Gift Card...");
    const { cartId, giftCardCode } = req.body;

    if (!cartId || !giftCardCode) {
      return res.status(400).json({
        success: false,
        message: "cartId and giftCardCode are required",
      });
    }
   console.log('12345')
    const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
    console.log("🚀 ~ SHOP_DOMAIN:", SHOP_DOMAIN)
    const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;
    console.log("🚀 ~ STOREFRONT_TOKEN:", STOREFRONT_TOKEN)

    if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
      return res.status(500).json({
        success: false,
        message: "Storefront configuration missing",
      });
    }

    const query = `
      mutation cartGiftCardCodesAdd($cartId: ID!, $giftCardCodes: [String!]!) {
        cartGiftCardCodesAdd(cartId: $cartId, giftCardCodes: $giftCardCodes) {
          cart {
            id
            appliedGiftCards {
              lastCharacters
              amountUsed {
                amount
                currencyCode
              }
            }
            cost {
              totalAmount {
                amount
                currencyCode
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      cartId,
      giftCardCodes: [giftCardCode],
    };

    const response = await fetch(
      `https://${SHOP_DOMAIN}/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const result = await response.json();
    console.log("🛒 Shopify Response:", JSON.stringify(result));

    const errors = result?.data?.cartGiftCardCodesAdd?.userErrors;
    if (errors && errors.length) {
      return res.status(400).json({
        success: false,
        message: errors[0].message,
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      cart: result.data.cartGiftCardCodesAdd.cart,
    });

  } catch (error) {
    console.error("❌ Error in applyGiftCart:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

// ✅ Get Applied Gift Cards (GET)
exports.getAppliedGiftCards = async (req, res) => {
  try {
    console.log("➡ Fetching Applied Gift Cards...");
    const { cartId } = req.query;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "cartId is required",
      });
    }

    const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
    const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;

    if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
      return res.status(500).json({
        success: false,
        message: "Storefront configuration missing",
      });
    }

    const query = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          appliedGiftCards {
            lastCharacters
            amountUsed {
              amount
              currencyCode
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const variables = { cartId };

    const response = await fetch(
      `https://${SHOP_DOMAIN}/api/2025-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    const result = await response.json();
    console.log("🛒 Shopify Response:", JSON.stringify(result));

    return res.status(200).json({
      success: true,
      cart: result.data.cart,
    });

  } catch (error) {
    console.error("❌ Error in getAppliedGiftCards:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
