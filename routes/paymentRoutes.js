const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Only initialize Razorpay if real credentials are provided
let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && 
    process.env.RAZORPAY_KEY_SECRET && 
    process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_actual_key_id_here' &&
    process.env.RAZORPAY_KEY_SECRET !== 'your_actual_secret_key_here') {
  
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized');
} else {
  console.warn('⚠️  Razorpay not configured - using placeholder values');
  console.warn('⚠️  Get real keys from: https://dashboard.razorpay.com/app/keys');
}

router.post('/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Please contact administrator.'
      });
    }

    const options = {
      amount: parseInt(process.env.APPLICATION_FEE || 500) * 100,
      currency: 'INR',
      receipt: 'receipt_' + Date.now(),
      notes: {
        application_type: 'university_admission'
      }
    };

    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order: ' + error.message
    });
  }
});

router.post('/verify', (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_SECRET || 
        process.env.RAZORPAY_KEY_SECRET === 'your_actual_secret_key_here') {
      return res.status(503).json({
        success: false,
        message: 'Payment verification not configured'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment details'
      });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      res.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed: ' + error.message
    });
  }
});

module.exports = router;
