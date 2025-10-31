const express = require('express');
const router = express.Router();
const { createRazorpayOrder, verifyPayment } = require('../payment/CreateOrder');

// Test Razorpay Configuration
router.get('/test-config', (req, res) => {
  console.log('🧪 Testing Razorpay Configuration');
  console.log('🔑 Key ID:', process.env.RAZORPAY_KEY_ID);
  console.log('🔐 Key Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing');
  
  res.json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    keySecretLength: process.env.RAZORPAY_KEY_SECRET?.length || 0,
  });
});

// Create Razorpay Order
router.post('/create-order', createRazorpayOrder);

// Verify Razorpay Payment
router.post('/verify', verifyPayment);

module.exports = router;
