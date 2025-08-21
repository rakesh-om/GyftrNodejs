
const Gyterredeem = require('../models/GyftrRedemptions');
exports.getCouponStatus = async (req, res) => {
  try {
    const { transactionId, couponId } = req.body;

    // ✅ Input validation
    if (!transactionId || !couponId) {
      return res.status(400).json({
        status: false,
        message: 'transactionId and couponId are required'
      });
    }

    // ✅ Query the database
    const couponStatus = await Gyterredeem.findOne({
      where: {
        gytr_order_id: transactionId,
        coupon_id: couponId
      },
      attributes: ['refunded']
    });

    // ✅ Handle not found
    if (!couponStatus) {
      return res.status(404).json({
        status: false,
        message: 'Coupon not found for the given transactionId and couponId'
      });
    }

    // ✅ Check refund status
    const refunded = couponStatus.refunded;

    if (refunded === true) {
      return res.status(200).json({
        status: true,
        message: 'Coupon has been refunded',
        data: couponStatus
      });
    } else {
      return res.status(200).json({
        status: false,
        message: 'Coupon has not been refunded',
        data: couponStatus
      });
    }
  } catch (error) {
    console.error('Error fetching coupon status:', error);
    return res.status(500).json({
      status: false,
      message: 'Internal server error'
    });
  }
};

