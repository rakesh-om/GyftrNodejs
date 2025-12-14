const fetch = require("node-fetch");

async function applyGiftCardToCart({ cartId, giftCardCode }) {
  const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
  const STOREFRONT_TOKEN = process.env.STOREFRONT_TOKEN;

  if (!SHOP_DOMAIN || !STOREFRONT_TOKEN) {
    throw new Error("Shopify Storefront config missing");
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

  const response = await fetch(
    `https://${SHOP_DOMAIN}/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query,
        variables: {
          cartId,
          giftCardCodes: [giftCardCode],
        },
      }),
    }
  );

  const result = await response.json();

  const errors = result?.data?.cartGiftCardCodesAdd?.userErrors;
  if (errors && errors.length) {
    throw new Error(errors[0].message);
  }

  return result.data.cartGiftCardCodesAdd.cart;
}

module.exports = { applyGiftCardToCart };
