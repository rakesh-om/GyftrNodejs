const axios = require("axios");
const ShopifySession = require("../models/ShopifySession"); // Import your model


exports.applyGiftCardToCart = async (shop, adminToken, cartId, giftCardCode) => {

  const session = await ShopifySession.findOne({ where: { shop } });
  if (!session || !session.storefront_access_token) {
    throw new Error("Storefront access token not found for this shop");
  }
  const storefrontToken = session.storefront_access_token;


  // 2️ Apply Gift Card
  const cartRes = await axios.post(
    `https://${shop}/api/2025-10/graphql.json`,
    {
      query: `
        mutation cartGiftCardCodesAdd($cartId: ID!, $giftCardCodes: [String!]!) {
          cartGiftCardCodesAdd(cartId: $cartId, giftCardCodes: $giftCardCodes) {
            cart {
              id
              appliedGiftCards {
                lastCharacters
                amountUsed { amount }
              }
            }
            userErrors { message }
          }
        }
      `,
      variables: {
        cartId,
        giftCardCodes: [giftCardCode],
      },
    },
    {
      headers: {
        "X-Shopify-Storefront-Access-Token": storefrontToken,
        "Content-Type": "application/json",
      },
    }
  );

  const errors = cartRes.data.data.cartGiftCardCodesAdd.userErrors;
  if (errors.length) throw new Error(errors[0].message);

  return cartRes.data.data.cartGiftCardCodesAdd.cart;
};
