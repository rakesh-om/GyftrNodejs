const fetch = require("node-fetch");

const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

if (!SHOP_DOMAIN || !ADMIN_API_TOKEN) {
  throw new Error("Shopify Admin config missing");
}

async function shopifyAdminGraphql(query, variables = {}) {
  const response = await fetch(
    `https://${SHOP_DOMAIN}/admin/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_API_TOKEN
      },
      body: JSON.stringify({ query, variables })
    }
  );

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

module.exports = { shopifyAdminGraphql };
