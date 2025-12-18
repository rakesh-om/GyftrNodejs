const axios = require("axios");

exports.createGiftCard = async (shop, adminToken, amount, code) => {
  const query = `
    mutation giftCardCreate($input: GiftCardCreateInput!) {
      giftCardCreate(input: $input) {
        giftCard {
          id
          maskedCode
          initialValue { amount }
        }
        userErrors { message }
      }
    }
  `;

  const variables = {
    input: {
      initialValue: parseFloat(amount),
      code,
    },
  };

  const res = await axios.post(
    `https://${shop}/admin/api/2025-10/graphql.json`,
    { query, variables },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": adminToken,
      },
    }
  );

  const result = res.data.data.giftCardCreate;

  if (result.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  return result.giftCard;
};
