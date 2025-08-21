const db = require('../config/dbConnect');
const Webhook = require('../models/WebhookData');
const axios = require('axios');
exports.updateAttribute =  async(req,res) =>{
    
     try {
    // 1. Fetch all webhook records where coupons  remove from checkout but attribute enabled yes
    const records = await Webhook.findAll({
      where: { 
        use_gyftr: 'yes',
        coupon_code:null
       },
      attributes: ['order_id', 'shop_id', 'id', 'shop_name']
    });

    // If no unprocessed coupons are found, return a 404 response
    if (!records.length) {
      return res.status(404).json({ message: 'No unprocessed coupons found' });
    }

    // 2. Loop through each unprocessed record
    for (const record of records) {
      const { order_id,id, shop_name } = record;

      // 3. Retrieve merchant's access token from the Setting table using the shop name
      const [merchant] = await db.query(
        'SELECT shop, accessToken FROM Setting WHERE shop = :shopName',
        {
          replacements: { shopName: shop_name },
          type: db.QueryTypes.SELECT
        }
      );

      // If merchant is not found, log and skip to the next record
      if (!merchant) {
        console.warn(`No merchant found for shop_id: ${shop_name}`);
        continue;
      }

      const shopDomain = merchant.shop;
      const accessToken = merchant.accessToken;

      // 4. Fetch the order details from Shopify using REST API
      const orderResponse = await axios.put(
        `https://${shopDomain}/admin/api/2024-01/orders/${order_id}.json`,
        {
            order: {
                id: order_id,
                note_attributes: [] 
            }
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );

      // 5. Check if note_attributes are empty in Shopify's response
        const updatedNoteAttributes = orderResponse.data?.order?.note_attributes;
        const isNoteAttrCleared = Array.isArray(updatedNoteAttributes) && updatedNoteAttributes.length === 0;

        if (isNoteAttrCleared) {
            console.log(`✅ note_attributes successfully cleared for order ${order_id}`);

            // 6. Update your DB to mark as processed
            await Webhook.update(
            { update_attribute: true },
            { where: { id } }
            );
           console.log(`📦 Webhook record updated in DB for order ${order_id}`);
        }else{
            console.log('else condition');
        }

    }

    // 8. Return success response after processing all records
    return res.status(200).json({ message: 'Attribute  and webhook data updated' });

  } catch (error) {
    // Catch any unhandled errors and return a 500 error response
    console.error('❌ Error in deleteCoupon:', error.message);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}