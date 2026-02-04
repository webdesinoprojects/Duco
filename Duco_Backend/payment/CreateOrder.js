const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Debug environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const isTestMode = RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.includes('test');
const isLiveMode = RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.includes('live');

console.log('🔍 Razorpay Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  KEY_ID_PREFIX: RAZORPAY_KEY_ID ? RAZORPAY_KEY_ID.substring(0, 15) + '...' : 'NOT SET',
  KEY_MODE: isTestMode ? '🧪 TEST MODE' : isLiveMode ? '💰 LIVE MODE' : '❌ UNKNOWN MODE',
  HAS_KEY_SECRET: !!RAZORPAY_KEY_SECRET,
  PRODUCTION_ENV: process.env.NODE_ENV === 'production'
});

// ✅ CRITICAL: Validate Razorpay keys are set for production
if (process.env.NODE_ENV === 'production') {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error('❌ CRITICAL: Razorpay keys not configured for PRODUCTION!');
    console.error('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables');
  }
  if (isTestMode) {
    console.error('❌ WARNING: Using TEST Razorpay keys in PRODUCTION environment!');
    console.error('   This will NOT process real payments. Use live keys instead.');
  }
}

// ✅ DEFENSIVE CHECK: Prevent initialization if keys are completely missing
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ FATAL: Cannot initialize Razorpay - missing credentials');
  console.error('💡 Required: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
  // Continue with null to allow server to start, but payment endpoints will fail gracefully
}

const razorpay = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET 
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  : null;

// Create Razorpay order with partial payment support
const createRazorpayOrder = async (req, res) => {
  console.group('💳 BACKEND: Creating Razorpay Order');
  console.log('⏰ Request received at:', new Date().toISOString());
  console.log('🔑 Razorpay Mode:', isTestMode ? '🧪 TEST' : isLiveMode ? '💰 LIVE' : '❌ UNKNOWN');
  console.log('🌐 Environment:', process.env.NODE_ENV);

  // ✅ DEFENSIVE CHECK: Fail fast if Razorpay is not initialized
  if (!razorpay) {
    console.error('❌ FATAL: Razorpay not initialized - missing credentials');
    console.error('💡 Required: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment');
    console.groupEnd();
    return res.status(500).json({
      error: 'Payment gateway not configured',
      details: 'Razorpay credentials are missing. Please contact administrator.',
    });
  }

  try {
    console.log('🔍 STEP 1: Validating request body...');
    let { amount, half = false } = req.body;

    console.log('📥 Request body:', { amount, half });
    console.log('🔑 Razorpay Configuration Check:', {
      keySet: !!RAZORPAY_KEY_ID,
      secretSet: !!RAZORPAY_KEY_SECRET,
      mode: isTestMode ? '🧪 TEST' : isLiveMode ? '💰 LIVE' : 'UNKNOWN',
    });

    if (!amount || isNaN(amount)) {
      console.error('❌ CRITICAL: Invalid amount:', amount);
      return res
        .status(400)
        .json({ error: 'Amount is required and must be a number' });
    }

    console.log('✅ Amount validation passed');

    // ✅ IMPORTANT: Frontend already sends the final amount to charge
    // Do NOT divide by 2 again - the 'half' flag is just for record keeping
    // The frontend calculates halfPayAmountINR and sends that directly
    const finalAmount = amount; // Use the amount as-is (already calculated by frontend)
    const amountInPaise = Math.round(finalAmount * 100);

    console.log('🔍 STEP 2: Calculating amounts...');
    console.log('💰 Amount from frontend:', amount);
    console.log('💰 Final amount to charge (INR):', finalAmount);
    console.log('💰 Amount in paise:', amountInPaise);
    console.log('🔀 Half payment flag:', half);

    console.log('🔍 STEP 3: Creating Razorpay order...');
    
    // ✅ Razorpay supports multiple currencies (INR, USD, EUR, GBP, etc.)
    const { currency = 'INR', customerCountry, customerCity, customerState, displayCurrency, displayAmount } = req.body;
    const isInternational = customerCountry && !['India', 'IN', 'IND'].includes(customerCountry);
    
    // ✅ Map supported currencies for Razorpay
    const supportedCurrencies = {
      'INR': 'INR',
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
      'AED': 'AED',
      'AUD': 'AUD',
      'CAD': 'CAD',
      'SGD': 'SGD',
      'NZD': 'NZD',
      'CHF': 'CHF',
      'JPY': 'JPY',
      'CNY': 'CNY',
      'HKD': 'HKD',
      'MYR': 'MYR',
      'THB': 'THB',
      'SAR': 'SAR',
      'QAR': 'QAR',
      'KWD': 'KWD',
      'BHD': 'BHD',
      'OMR': 'OMR',
      'ZAR': 'ZAR',
      'PKR': 'PKR',
      'LKR': 'LKR',
      'BDT': 'BDT',
      'NPR': 'NPR',
      'PHP': 'PHP',
      'IDR': 'IDR',
      'KRW': 'KRW',
    };
    
    // ✅ Use requested currency if supported, otherwise default to INR
    const razorpayCurrency = supportedCurrencies[currency] || 'INR';
    
    const orderData = {
      amount: amountInPaise,
      currency: razorpayCurrency, // ✅ Use requested currency (Razorpay supports multiple)
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        // ✅ Store payment location and currency info in notes for reference
        customer_country: customerCountry || 'India',
        customer_city: customerCity || '',
        customer_state: customerState || '',
        display_currency: displayCurrency || razorpayCurrency,
        display_amount: displayAmount || finalAmount, // ✅ Store converted amount for display
        international_payment: isInternational,
        requested_currency: currency,
      }
    };
    
    console.log('🌍 Payment location info:', {
      country: customerCountry,
      city: customerCity,
      state: customerState,
      displayCurrency,
      displayAmount,
      isInternational,
      razorpayAmount: amountInPaise,
      razorpayCurrency: razorpayCurrency,
      requestedCurrency: currency,
      supported: !!supportedCurrencies[currency]
    });

    console.log('📤 Razorpay order data:', orderData);

    const order = await razorpay.orders.create(orderData);

    console.log('✅ Razorpay order created successfully');
    console.log('� Order Details:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      mode: isTestMode ? '🧪 TEST' : '💰 LIVE',
    });

    const response = { 
      orderId: order.id, 
      amount: order.amount, 
      half,
      // ✅ Return the actual currency used by Razorpay
      paymentCurrency: razorpayCurrency,
      displayCurrency: displayCurrency || razorpayCurrency,
      displayAmount: displayAmount || finalAmount,
      customerCountry: customerCountry || 'India',
      customerCity: customerCity || '',
      customerState: customerState || '',
      razorpayMode: isTestMode ? 'test' : 'live', // ✅ Return mode info to frontend
    };
    console.log('📤 Response Summary:', {
      orderId: response.orderId,
      amount: response.amount,
      mode: response.razorpayMode,
      currency: response.paymentCurrency,
    });
    console.groupEnd();

    res.json(response);
  } catch (err) {
    console.group('❌ BACKEND: Razorpay Order Creation Failed');
    console.error('❌ Error details:', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      response: err.response?.data,
      error: err.error,
      stack: err.stack,
    });
    console.error('🔍 Request details:', {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
    });
    console.groupEnd();

    // ✅ Better error messages for common issues
    let errorMessage = 'Razorpay order creation failed';
    let userMessage = err.message || 'Payment gateway error';
    
    // Check for test mode amount limit (typically ₹50,000)
    const amountInRupees = (req.body.amount || 0);
    if (err.statusCode === 400 && amountInRupees > 50000) {
      errorMessage = 'Amount exceeds test mode limit';
      userMessage = `Razorpay test mode has a limit of ₹50,000 per transaction. Your order amount (₹${amountInRupees.toLocaleString()}) exceeds this limit. Please use a smaller quantity for testing, or switch to live mode for production.`;
    }

    res.status(err.statusCode || 500).json({
      error: errorMessage,
      details: userMessage,
      statusCode: err.statusCode,
    });
  }
};

// Verify Razorpay payment signature
const verifyPayment = async (req, res) => {
  console.group('🔐 BACKEND: Verifying Razorpay Payment');
  console.log('⏰ Verification request received at:', new Date().toISOString());

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    console.group('💳 BACKEND: Verifying Razorpay Payment');
    console.log('⏰ Request received at:', new Date().toISOString());
    console.log('🔑 Razorpay Mode:', isTestMode ? '🧪 TEST' : isLiveMode ? '💰 LIVE' : '❌ UNKNOWN');
    
    console.log('🔍 STEP 1: Validating verification data...');
    console.log('📥 Verification request:', {
      razorpay_order_id,
      razorpay_payment_id,
      has_signature: !!razorpay_signature,
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ CRITICAL: Missing verification data');
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data',
      });
    }

    console.log('✅ Verification data validation passed');

    console.log('🔍 STEP 2: Generating expected signature...');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    console.log('📝 Signature body:', body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log('🔐 Expected signature:', expectedSignature);
    console.log('🔐 Received signature:', razorpay_signature);

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ CRITICAL: Signature mismatch');
      console.error('🔍 Signature comparison:', {
        expected: expectedSignature,
        received: razorpay_signature,
        match: expectedSignature === razorpay_signature,
      });
      return res
        .status(400)
        .json({ success: false, message: 'Signature mismatch' });
    }

    console.log('✅ Payment signature verification successful');
    console.log('📤 Sending success response to frontend');
    console.groupEnd();

    res.json({ success: true, razorpay_payment_id });
  } catch (err) {
    console.group('❌ BACKEND: Payment Verification Failed');
    console.error('❌ Error details:', {
      message: err.message,
      stack: err.stack,
    });
    console.error('🔍 Request details:', {
      body: req.body,
      headers: req.headers,
    });
    console.groupEnd();

    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      details: err.message,
    });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
};
