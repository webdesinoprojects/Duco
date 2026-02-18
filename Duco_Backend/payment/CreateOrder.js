const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();
const Order = require('../DataBase/Models/OrderModel');
const Invoice = require('../DataBase/Models/InvoiceModule');

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

const ensureRazorpay = (res) => {
  if (!razorpay) {
    console.error('❌ FATAL: Razorpay not initialized - missing credentials');
    console.error('💡 Required: Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment');
    res.status(500).json({
      error: 'Payment gateway not configured',
      details: 'Razorpay credentials are missing. Please contact administrator.',
    });
    return false;
  }
  return true;
};

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

// Create Razorpay order for remaining payment
const createRemainingOrder = async (req, res) => {
  console.group('💳 BACKEND: Creating Remaining Payment Order');
  if (!ensureRazorpay(res)) return;

  try {
    const { orderId } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findOne({ orderId }) || await Order.findById(orderId).catch(() => null);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const remainingAmount = Number(order.remainingAmount || 0);
    if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No remaining amount due' });
    }
    if (String(order.paymentStatus || '').toLowerCase() === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already fully paid' });
    }

    const amountInPaise = Math.round(remainingAmount * 100);
    if (amountInPaise < 1) {
      return res.status(400).json({ success: false, message: 'Remaining amount is too small to pay' });
    }

    const orderData = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rem_${String(order._id).slice(-20)}_${Date.now().toString().slice(-8)}`,
      payment_capture: 1,
      notes: {
        payment_type: 'remaining',
        order_id: String(order.orderId || order._id),
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderData);
    order.remainingPaymentOrderId = razorpayOrder.id;
    await order.save();

    console.log('✅ Remaining payment order created:', {
      orderId: order.orderId || order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
    });
    console.groupEnd();

    return res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
    });
  } catch (err) {
    console.error('❌ Remaining payment order creation failed:', err.message);
    console.error('❌ Full error object:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      message: err.message,
      description: err.description,
      code: err.code,
      statusCode: err.statusCode,
      error: err.error,
      name: err.name,
    });
    console.groupEnd();
    return res.status(500).json({ 
      success: false, 
      message: err.message || err.description || 'Failed to create remaining payment order',
      details: err.description || err.error?.description || 'Unknown error',
      errorCode: err.code || err.error?.code,
    });
  }
};

// Verify remaining payment and update existing order
const verifyRemainingPayment = async (req, res) => {
  console.group('🔐 BACKEND: Verifying Remaining Payment');
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    console.log('📥 Request data:', { orderId, razorpay_order_id, razorpay_payment_id });

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing verification data');
      return res.status(400).json({ success: false, message: 'Missing payment verification data' });
    }

    console.log('🔐 Verifying signature...');
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Signature mismatch');
      return res.status(400).json({ success: false, message: 'Signature mismatch' });
    }
    console.log('✅ Signature verified');

    console.log('🔍 Finding order...');
    const order = await Order.findOne({ orderId }) || await Order.findById(orderId).catch(() => null);
    if (!order) {
      console.error('❌ Order not found:', orderId);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    console.log('✅ Order found:', order._id);

    console.log('📊 Order status before update:', {
      orderId: order.orderId || order._id,
      paymentStatus: order.paymentStatus,
      remainingAmount: order.remainingAmount,
      advancePaidAmount: order.advancePaidAmount,
      totalAmount: order.totalAmount,
    });

    if (order.remainingPaymentOrderId && order.remainingPaymentOrderId !== razorpay_order_id) {
      console.error('❌ Payment order mismatch');
      return res.status(400).json({ success: false, message: 'Payment order mismatch' });
    }

    const remainingAmount = Number(order.remainingAmount || 0);
    if (!Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      console.warn('⚠️ No remaining amount due - order already paid?');
      return res.status(400).json({ success: false, message: 'No remaining amount due' });
    }

    console.log('💰 Updating order payment status...');
    order.remainingAmount = 0;
    order.advancePaidAmount = Number(order.totalAmount || 0);
    order.paymentStatus = 'paid';
    order.remainingPaymentId = razorpay_payment_id;
    order.remainingPaymentOrderId = null;
    
    const savedOrder = await order.save();
    console.log('✅ Order saved successfully');
    console.log('📊 Order status after update:', {
      orderId: savedOrder.orderId || savedOrder._id,
      paymentStatus: savedOrder.paymentStatus,
      remainingAmount: savedOrder.remainingAmount,
      advancePaidAmount: savedOrder.advancePaidAmount,
      totalAmount: savedOrder.totalAmount,
      remainingPaymentId: savedOrder.remainingPaymentId,
    });

    // ✅ Update invoice amountPaid to full amount
    console.log('📄 Updating invoice...');
    try {
      const invoice = await Invoice.findOne({ order: order._id });
      if (invoice) {
        invoice.amountPaid = Number(order.totalAmount || 0);
        invoice.paymentmode = 'online'; // Change from 50% to online since it's now fully paid
        await invoice.save();
        console.log('✅ Invoice updated with full payment amount:', invoice.amountPaid);
      } else {
        console.warn('⚠️ No invoice found for order:', order._id);
      }
    } catch (invoiceErr) {
      console.error('❌ Failed to update invoice:', invoiceErr.message);
      // Don't fail the whole payment if invoice update fails
    }

    // ✅ Update wallet transaction status from "Pending" to "Paid Fully"
    console.log('💰 Updating wallet transaction...');
    try {
      const Wallet = require('../DataBase/Models/Wallet');
      const wallet = await Wallet.findOne({ user: order.user });
      if (wallet) {
        // Find the transaction for this order
        const transaction = wallet.transactions.find(tx => 
          String(tx.order) === String(order._id) && tx.status === 'Pending'
        );
        if (transaction) {
          transaction.status = 'Paid Fully';
          transaction.note = `Payment completed. Total amount: ₹${Number(order.totalAmount || 0).toLocaleString()}`;
          wallet.balance = Math.max(0, (wallet.balance || 0) - Number(transaction.amount || 0));
          await wallet.save();
          console.log('✅ Wallet transaction updated to Paid Fully');
        } else {
          console.warn('⚠️ No pending wallet transaction found for order:', order._id);
        }
      } else {
        console.warn('⚠️ No wallet found for user:', order.user);
      }
    } catch (walletErr) {
      console.error('❌ Failed to update wallet transaction:', walletErr.message);
      // Don't fail the whole payment if wallet update fails
    }

    console.log('✅ Remaining payment verified and order updated:', {
      orderId: savedOrder.orderId || savedOrder._id,
      paymentId: razorpay_payment_id,
    });
    console.groupEnd();

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ Remaining payment verification failed:', err.message);
    console.error('❌ Full error:', err);
    console.groupEnd();
    return res.status(500).json({ success: false, message: err.message || 'Remaining payment verification failed' });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  createRemainingOrder,
  verifyRemainingPayment,
};
