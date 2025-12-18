const axios = require("axios");

exports.applyGiftCardToCart = async (shop, adminToken, cartId, giftCardCode) => {

  // 1️ Create Storefront Token
  const tokenRes = await axios.post(
    `https://${shop}/admin/api/2025-10/graphql.json`,
    {
      query: `
        mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
          storefrontAccessTokenCreate(input: $input) {
            storefrontAccessToken { accessToken }
            userErrors { message }
          }
        }
      `,
      variables: { input: { title: "Gyftr Token" } },
    },
    {
      headers: {
        "X-Shopify-Access-Token": adminToken,
        "Content-Type": "application/json",
      },
    }
  );

  const storefrontToken =
    tokenRes.data.data.storefrontAccessTokenCreate.storefrontAccessToken
      .accessToken;

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
