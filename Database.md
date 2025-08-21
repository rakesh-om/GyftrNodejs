## 🗄️ Database Schema

This middleware application uses MySQL for data storage, with Sequelize as the ORM. Below is a summary of the key tables in the database.

---

### 📦 GyftrRedemptions

| Column         | Type     | Description                                |
|----------------|----------|--------------------------------------------|
| id             | INTEGER  | Primary key, auto-incremented              |
| user_id        | BIGINT   | ID of the user                             |
| shopify_order_id | BIGINT | Shopify Order ID                           |
| gytr_order_id  | VARCHAR  | GyFTR Order ID                             |
| coupon_code    | VARCHAR(100) | Coupon code used                       |
| coupon_id      | VARCHAR(100) | Coupon identifier                      |
| amount         | VARCHAR(100) | Redemption amount                      |
| mid            | VARCHAR(100) | Merchant ID                            |
| requestid      | VARCHAR(100) | Request ID from GyFTR                  |
| redeemed_at    | DATETIME | Time of redemption                         |
| refunded       | BOOLEAN  | Whether the coupon was refunded            |

---

### 🛒 Cartdetails

| Column     | Type        | Description                              |
|------------|-------------|------------------------------------------|
| id         | INTEGER     | Primary key, auto-incremented            |
| total      | VARCHAR(100)| Total amount                             |
| porderid   | VARCHAR(100)| Partner Order ID                         |
| shopid     | VARCHAR(255)| Shopify Shop ID                          |
| tid        | VARCHAR(100)| Transaction ID                           |
| CustomerId | VARCHAR(100)| Customer ID                              |
| baseUrl    | VARCHAR(100)| Base URL                                 |
| CouponCode | VARCHAR(100)| Coupon applied                           |

---

### 💸 Refund

| Column              | Type        | Description                            |
|---------------------|-------------|----------------------------------------|
| id                  | INTEGER     | Primary key, auto-incremented          |
| shop_order_id       | VARCHAR(100)| Shopify Order ID                       |
| refund_webhook_req  | TEXT        | Raw refund webhook request (JSON)      |
| order_txn_id        | VARCHAR(100)| Original transaction ID                |
| refund_amount       | VARCHAR(100)| Refunded amount                        |
| refund_txn_id       | VARCHAR(100)| Transaction ID of refund               |
| shop_name           | VARCHAR(100)| Shop name                              |
| shop_id             | VARCHAR(100)| Shop identifier                        |
| refunded            | BOOLEAN     | Whether refund was processed           |

---

### 🌐 Webhook

| Column           | Type        | Description                                  |
|------------------|-------------|----------------------------------------------|
| id               | INTEGER     | Primary key, auto-incremented                |
| webhookreq       | TEXT        | Raw webhook request body                     |
| shop_name        | VARCHAR(100)| Shop name                                    |
| shop_id          | VARCHAR(100)| Shop identifier                              |
| order_id         | BIGINT      | Shopify Order ID                             |
| processed        | INTEGER     | Whether order was processed (0/1)            |
| coupon_processed | INTEGER     | Whether coupon was processed (0/1)           |
| created_at       | DATETIME    | Created timestamp (auto-managed by Sequelize)|
| updated_at       | DATETIME    | Updated timestamp                            |

---

### 🔗 Relationships (Optional)

```text
GyftrRedemptions.user_id → users.id (if applicable)
Webhook.order_id → GyftrRedemptions.shopify_order_id
Refund.shop_order_id → Webhook.order_id
Cartdetails.CustomerId → GyftrRedemptions.user_id
