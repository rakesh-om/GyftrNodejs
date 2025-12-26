const axios = require("axios");

exports.createGiftCard = async (shop, adminToken, amount, code) => {
  console.log("Admin Token:", adminToken);
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
console.log("Gift Card Creation Response:", res.data);

  const result = res.data.data.giftCardCreate;

  if (result.userErrors?.length) {
    throw new Error(result.userErrors[0].message);
  }

  console.log("Created Gift Card:", result);
  return result.giftCard;
};
