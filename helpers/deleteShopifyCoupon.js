const axios = require('axios');

/**
 * Deletes a Shopify Discount Code using GraphQL
 * 
 * @param {string} couponId - The numeric coupon ID (e.g., 1419283824880)
 * @param {string} shopDomain - The myshopify domain (e.g., example.myshopify.com)
 * @param {string} accessToken - The shop's admin access token
 * @returns {object} - The response from Shopify or error details
 */
const deleteShopifyCoupon = async (couponId, shopDomain, accessToken) => {
  try {
    const gid = `gid://shopify/DiscountCodeNode/${couponId}`;

    const mutationData = JSON.stringify({
      query: `
        mutation {
          discountCodeDelete(id: "${gid}") {
            deletedCodeDiscountId
            userErrors {
              field
              code
              message
            }
          }
        }
      `
    });

    const config = {
      method: 'post',
      url: `https://${shopDomain}/admin/api/2025-07/graphql.json`,
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      data: mutationData
    };

    const response = await axios.request(config);
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = deleteShopifyCoupon;
