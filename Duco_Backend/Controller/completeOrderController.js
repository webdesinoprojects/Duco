const Razorpay = require('razorpay');
const Order = require('../DataBase/Models/OrderModel');
const Design = require('../DataBase/Models/DesignModel');
const CorporateSettings = require('../DataBase/Models/CorporateSettings');
const { createInvoice } = require('./invoiceService');
const { getOrCreateSingleton } = require('../Router/DataRoutes');
const { createTransaction } = require('./walletController');
const { createPrintroveOrder } = require('./printroveHelper');
const { calculateOrderTotal } = require('../Service/TaxCalculationService');
const LZString = require('lz-string'); // ✅ added for decompression

// ✅ Helper function to handle Printrove routing based on order type
const handlePrintroveRouting = async (order, isCorporateOrder) => {
  // B2B orders NEVER go to Printrove - managed internally by Duco
  if (isCorporateOrder) {
    console.log('🏢 B2B/Corporate Order - Managed by Duco, skipping Printrove');
    order.printroveStatus = 'Corporate Order - No Printrove';
    await order.save();
    return;
  }
  
  // ✅ ALL B2C orders (both regular AND designer) go to Printrove
  console.log('🛍️ B2C Order - Sending to Printrove');
  try {
    const printData = await createPrintroveOrder(order);
    order.printroveOrderId = printData?.order?.id || printData?.id || null;
    order.printroveStatus = printData?.order?.status || printData?.status || 'Processing';
    order.printroveItems = printData?.order?.order_products || printData?.items || [];
    order.printroveTrackingUrl = printData?.order?.tracking_url || printData?.tracking_url || '';
    await order.save();
    console.log('✅ B2C Order sent to Printrove:', order.printroveOrderId);
  } catch (err) {
    console.error('❌ Printrove sync failed:', err.message);
    order.printroveStatus = 'Error';
    await order.save();
  }
};

// --- Razorpay client ---
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Helpers ---
function safeNum(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function sumQuantity(obj) {
  return Object.values(obj || {}).reduce((acc, q) => acc + safeNum(q, 0), 0);
}

// ✅ Helper to detect currency from country
function getCurrencyFromCountry(country) {
  if (!country) return 'INR';
  
  const countryLower = country.toLowerCase().trim();
  
  const countryCurrencyMap = {
    'india': 'INR',
    'united states': 'USD',
    'usa': 'USD',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'europe': 'EUR',
    'germany': 'EUR',
    'france': 'EUR',
    'spain': 'EUR',
    'italy': 'EUR',
    'netherlands': 'EUR',
    'belgium': 'EUR',
    'austria': 'EUR',
    'portugal': 'EUR',
    'greece': 'EUR',
    'ireland': 'EUR',
    'uae': 'AED',
    'dubai': 'AED',
    'united arab emirates': 'AED',
    'australia': 'AUD',
    'canada': 'CAD',
    'singapore': 'SGD',
    'new zealand': 'NZD',
    'switzerland': 'CHF',
    'japan': 'JPY',
    'china': 'CNY',
    'hong kong': 'HKD',
    'malaysia': 'MYR',
    'thailand': 'THB',
    'saudi arabia': 'SAR',
    'qatar': 'QAR',
    'kuwait': 'KWD',
    'bahrain': 'BHD',
    'oman': 'OMR',
    'south africa': 'ZAR',
    'pakistan': 'PKR',
    'sri lanka': 'LKR',
    'bangladesh': 'BDT',
    'nepal': 'NPR',
    'philippines': 'PHP',
    'indonesia': 'IDR',
    'south korea': 'KRW',
    'korea': 'KRW',
  };
  
  return countryCurrencyMap[countryLower] || 'INR';
}

function buildInvoiceItems(products, { hsn = '7307', unit = 'Pcs.' } = {}) {
  const items = [];
  (products || []).forEach((p) => {
    const qty = sumQuantity(p.quantity);
    if (!qty) return;
    
    // ✅ Priority: pricing array (actual product price) > p.price (cart price)
    let itemPrice = 0;
    if (p.pricing && Array.isArray(p.pricing) && p.pricing.length > 0) {
      itemPrice = safeNum(p.pricing[0]?.price_per, 0);
    }
    // Fallback to p.price if pricing array doesn't have valid price
    if (itemPrice === 0) {
      itemPrice = safeNum(p.price, 0);
    }
    
    console.log(`📦 Invoice item: ${p.products_name || p.name || 'Item'} - Price: ${itemPrice} (from ${p.pricing ? 'pricing array' : 'p.price'})`);
    
    items.push({
      description: p.products_name || p.name || 'Item',
      barcode: p._id || '',
      hsn,
      qty,
      unit,
      price: itemPrice,
    });
  });
  return items;
}

function formatDateDDMMYYYY(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function addressToLine(a = {}) {
  const {
    fullName = '',
    houseNumber = '',
    street = '',
    landmark = '',
    city = '',
    state = '',
    pincode = '',
    country = '',
  } = a || {};
  return [
    fullName,
    houseNumber,
    street,
    landmark,
    city,
    state && `${state} - ${pincode}`,
    country,
  ]
    .filter(Boolean)
    .join(', ');
}

// ✅ Helper to build invoice payload with billing and shipping addresses
function buildInvoicePayload(order, orderData, addresses, legacyAddress, items, pfCharge, printingCharge, settings, orderType, paymentmode = 'online', totalAmount = 0) {
  const billingAddr = addresses?.billing || legacyAddress;
  const shippingAddr = addresses?.shipping || legacyAddress;
  
  // ✅ Extract GST/Tax number from orderData if provided
  const gstNumber = orderData?.gstNumber?.trim() || billingAddr?.gstNumber?.trim() || '';
  
  // ✅ Calculate amount paid based on payment mode
  // For 50% payments, totalAmount is already the 50% amount (from frontend)
  // So we use it directly as amountPaid
  let amountPaid = totalAmount;
  if (paymentmode === '50%') {
    // totalAmount is already 50% from frontend, so use it directly
    amountPaid = totalAmount;
  }
  
  const payload = {
    company: settings?.company,
    invoice: {
      number: String(order._id),
      date: formatDateDDMMYYYY(),
      placeOfSupply: billingAddr?.state || settings?.invoice?.placeOfSupply,
      reverseCharge: !!settings?.invoice?.reverseCharge,
      copyType: settings?.invoice?.copyType || 'Original Copy',
    },
    billTo: {
      name: billingAddr?.fullName || orderData.user?.name || '',
      address: addressToLine(billingAddr),
      gstin: gstNumber, // ✅ Use customer's GST number if provided
      state: billingAddr?.state || '',
      country: billingAddr?.country || 'India',
    },
    items: buildInvoiceItems(items),
    charges: {
      pf: pfCharge,
      printing: printingCharge,
    },
    terms: settings?.terms,
    forCompany: settings?.forCompany,
    order: order._id,
    orderType: orderType, // ✅ Pass order type to invoice
    paymentmode: paymentmode, // ✅ Add payment mode
    amountPaid: amountPaid, // ✅ Add amount paid (for 50% payments)
  };
  
  // ✅ Add shipTo only if different from billing
  // Compare by address content, not object reference
  const isSameAddress = addresses?.sameAsBilling || 
    (billingAddr && shippingAddr && 
     billingAddr.fullName === shippingAddr.fullName &&
     billingAddr.houseNumber === shippingAddr.houseNumber &&
     billingAddr.street === shippingAddr.street &&
     billingAddr.city === shippingAddr.city &&
     billingAddr.state === shippingAddr.state &&
     billingAddr.pincode === shippingAddr.pincode);
  
  console.log('🏠 Address Comparison:', {
    sameAsBillingFlag: addresses?.sameAsBilling,
    billingName: billingAddr?.fullName,
    shippingName: shippingAddr?.fullName,
    isSameAddress,
    willAddShipTo: addresses?.shipping && !isSameAddress
  });
  
  if (addresses?.shipping && !isSameAddress) {
    payload.shipTo = {
      name: orderData.user?.name || '',
      address: addressToLine(shippingAddr),
      state: shippingAddr?.state || '',
      country: shippingAddr?.country || 'India',
    };
    console.log('✅ Added shipTo to invoice:', payload.shipTo);
  } else {
    console.log('⏭️ Skipping shipTo - addresses are the same');
  }
  
  return payload;
}

async function verifyRazorpayPayment(paymentId, expectedAmountINR) {
  if (!paymentId) throw new Error('Missing paymentId');
  const payment = await razorpay.payments.fetch(paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'captured') {
    throw new Error(`Payment not captured (status: ${payment.status})`);
  }
  const expectedPaise = Math.round(safeNum(expectedAmountINR, 0) * 100);
  if (safeNum(payment.amount, -1) !== expectedPaise) {
    throw new Error(
      `Payment amount mismatch. Expected ₹${expectedAmountINR}, got ₹${safeNum(payment.amount, 0) / 100
      }`
    );
  }
  return payment;
}

// ================================================================
// COMPLETE ORDER
// ================================================================

// Simple in-memory cache to prevent duplicate processing
const processingCache = new Map();

const completeOrder = async (req, res) => {
  let { paymentId, orderData, paymentmode, compressed } = req.body || {};

  // ✅ Prevent duplicate processing for the same payment ID
  if (paymentId && paymentId !== 'manual_payment') {
    const cacheKey = `${paymentId}_${paymentmode}`;

    if (processingCache.has(cacheKey)) {
      const cachedTime = processingCache.get(cacheKey);
      const timeDiff = Date.now() - cachedTime;

      if (timeDiff < 30000) { // 30 seconds
        console.log('⚠️ Duplicate request detected within 30 seconds, checking for existing order...');
        
        // Try to find existing order for this payment
        try {
          const existingOrder = await Order.findOne({ razorpayPaymentId: paymentId });
          if (existingOrder) {
            console.log('✅ Found existing order:', existingOrder._id);
            return res.status(200).json({
              success: true,
              order: existingOrder,
              message: 'Request already being processed',
              duplicate: true
            });
          }
        } catch (err) {
          console.error('Error finding existing order:', err);
        }
        
        // If no order found yet, return without order (still processing)
        console.log('⚠️ Order still being processed, no order found yet');
        return res.status(202).json({
          success: false,
          message: 'Request already being processed, please wait',
          duplicate: true,
          processing: true
        });
      }
    }

    // Mark as processing
    processingCache.set(cacheKey, Date.now());

    // Clean up old entries (older than 5 minutes)
    for (const [key, time] of processingCache.entries()) {
      if (Date.now() - time > 300000) {
        processingCache.delete(key);
      }
    }
  }

  // ✅ Log raw data from frontend
  console.log('🔍 RAW REQUEST DATA FROM FRONTEND:', {
    paymentId,
    paymentmode,
    compressed,
    orderData: orderData
      ? {
        items: orderData.items?.length || 0,
        totalPay: orderData.totalPay,
        address: orderData.address,
        user: orderData.user,
        pf: orderData.pf,
        pfFlat: orderData.pfFlat,
        gst: orderData.gst,
        printing: orderData.printing,
        printingPerSide: orderData.printingPerSide,
        printingUnits: orderData.printingUnits,
      }
      : null,
  });

  // ✅ Normalize charge structure (accept both orderData.charges.* or flat fields)
  // Order model has pf and printing as direct fields, not nested in charges
  const pfCharge =
    safeNum(orderData?.pf, 0) || safeNum(orderData?.charges?.pf, 0) || 0;
  const printingCharge =
    safeNum(orderData?.printing, 0) ||
    safeNum(orderData?.charges?.printing, 0) ||
    0;
  
  console.log('💰 Charges extracted:', { pfCharge, printingCharge, orderDataPf: orderData?.pf, orderDataPrinting: orderData?.printing });

  try {
    // ✅ Check for duplicate orders based on payment ID
    if (paymentId && paymentId !== 'manual_payment') {
      const existingOrder = await Order.findOne({ razorpayPaymentId: paymentId });
      if (existingOrder) {
        console.log('⚠️ Duplicate order detected for payment ID:', paymentId);
        console.log('Existing order ID:', existingOrder._id);
        return res.status(200).json({
          success: true,
          order: existingOrder,
          message: 'Order already exists for this payment'
        });
      }
    }

    // ✅ Decompress if compressed
    if (compressed && typeof orderData === 'string') {
      try {
        const jsonString = LZString.decompressFromBase64(orderData);
        orderData = JSON.parse(jsonString);
        console.log('✅ Order data decompressed successfully');
      } catch (e) {
        console.error('❌ Decompression failed:', e.message);
        return res
          .status(400)
          .json({ success: false, message: 'Invalid compressed payload' });
      }
    }

    if (
      !orderData ||
      !orderData.items ||
      !orderData.user ||
      (!orderData.address && !orderData.addresses)
    ) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid order data' });
    }

    let order = null;
    let payment = null;

    const items = Array.isArray(orderData.items) ? orderData.items : [];
    const totalPay = safeNum(orderData.totalPay, 0);
    
    // ✅ Handle both old single address and new billing/shipping addresses
    let addresses = null;
    let legacyAddress = null;
    
    if (orderData.addresses) {
      // New format: separate billing and shipping
      addresses = {
        billing: {
          ...orderData.addresses.billing,
          email: orderData.addresses.billing?.email || orderData.user?.email || 'not_provided@duco.com'
        },
        shipping: {
          ...orderData.addresses.shipping,
          email: orderData.addresses.shipping?.email || orderData.user?.email || 'not_provided@duco.com'
        },
        sameAsBilling: orderData.addresses.sameAsBilling !== false
      };
    } else if (orderData.address) {
      // Legacy format: single address (use for both billing and shipping)
      legacyAddress = {
        ...orderData.address,
        email: orderData.address?.email || orderData.user?.email || 'not_provided@duco.com'
      };
    }

    const user =
      typeof orderData.user === 'object'
        ? orderData.user._id
        : orderData.user?.toString?.() || orderData.user;

    // ✅ Detect currency from billing address country
    const billingCountry = addresses?.billing?.country || legacyAddress?.country || 'India';
    const currency = getCurrencyFromCountry(billingCountry);
    
    // ✅ Get conversion rate and display price from orderData (try multiple locations)
    const conversionRate = safeNum(
      orderData.conversionRate || 
      orderData.totals?.conversionRate || 
      1
    );
    
    const displayPrice = safeNum(
      orderData.totalPayDisplay || 
      orderData.totals?.grandTotal || 
      totalPay
    );
    
    console.log('💱 Currency Detection:', {
      billingCountry,
      detectedCurrency: currency,
      priceInINR: totalPay,
      displayPrice: displayPrice,
      conversionRate: conversionRate,
      source: {
        conversionRate: orderData.conversionRate ? 'root' : orderData.totals?.conversionRate ? 'totals' : 'default',
        displayPrice: orderData.totalPayDisplay ? 'root' : orderData.totals?.grandTotal ? 'totals' : 'default'
      }
    });

    // ✅ Detect if order is Corporate (B2B) or Retail (B2C)
    const isCorporateOrder = (orderData?.items || []).some(
      (item) => item?.isCorporate === true
    );
    const orderType = isCorporateOrder ? 'B2B' : 'B2C';

    console.log('🏢 Order Type Detection:', {
      isCorporateOrder,
      orderType,
      items: (orderData?.items || []).map(item => ({
        name: item?.name || item?.products_name,
        isCorporate: item?.isCorporate
      }))
    });

    // ================================================================
    // CASE 0 – NORMALIZE PAYMENT MODE DISPLAY
    // ================================================================
    // ✅ Keep paymentmode as enum value, create readableMode for display only
    // ================================================================
    let readableMode = paymentmode;
    if (paymentmode === 'store_pickup') readableMode = 'Pay on Store';
    else if (paymentmode === 'netbanking') readableMode = 'Paid via Netbanking';
    else if (paymentmode === '50%') readableMode = '50% Advance Payment';
    else if (paymentmode === 'online') readableMode = 'Online Payment';
    else if (paymentmode === 'manual_payment') readableMode = 'Manual Payment';

    // ================================================================
    // VALIDATION: Store Pickup is ONLY for B2B Orders
    // ================================================================
    if (paymentmode === 'store_pickup' && !isCorporateOrder) {
      console.error('❌ Store Pickup payment method is only available for B2B orders');
      return res.status(403).json({
        success: false,
        message: 'Store Pickup payment method is only available for B2B (Corporate) orders'
      });
    }

    // ================================================================
    // CASE 1 – STORE PICKUP (NEW)
    // ================================================================
    if (paymentmode === 'store_pickup') {
      try {
        const orderPayload = {
          products: items,
          price: totalPay, // INR price (for Razorpay)
          totalPay: totalPay,
          user,
          status: 'Pending',
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: pfCharge,
          gst: safeNum(orderData.gst, 0),
          printing: printingCharge,
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
        };
        
        // ✅ Add addresses (new format) or address (legacy format)
        if (addresses) {
          orderPayload.addresses = addresses;
        } else if (legacyAddress) {
          orderPayload.address = legacyAddress;
        }
        
        order = await Order.create(orderPayload);
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          order = await Order.create({
            products: items,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            status: 'Pending',
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: pfCharge,
            gst: safeNum(orderData.gst, 0),
            printing: printingCharge,
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      // ✅ Handle Printrove routing based on order type
      await handlePrintroveRouting(order, isCorporateOrder);

      const settings = await getOrCreateSingleton();
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, pfCharge, printingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (store pickup):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 2 – NETBANKING
    // ================================================================
    if (paymentmode === 'netbanking') {
      order = await Order.create({
        products: items,
        price: totalPay,
        totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
        ...(addresses ? { addresses } : { address: legacyAddress }),
        user,
        razorpayPaymentId: paymentId || null,
        status: 'Pending',
        paymentmode: paymentmode, // ✅ Use enum value, not readableMode
        pf: pfCharge,
        printing: printingCharge,
        gst: safeNum(orderData.gst, 0),
        orderType,
        currency, // ✅ Customer's currency
        displayPrice, // ✅ Price in customer's currency
        conversionRate, // ✅ Conversion rate used
      });

      // ✅ Handle Printrove routing based on order type
      await handlePrintroveRouting(order, isCorporateOrder);

      const settings = await getOrCreateSingleton();
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, pfCharge, printingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (netbanking):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 3 - ONLINE (FULL)
    // ================================================================
    if (paymentmode === 'online') {
      console.warn('⚠️ Skipping Razorpay verification for testing mode');
      payment = { id: paymentId || 'test_payment_id_001' };

      try {
        order = await Order.create({
          products: items,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: pfCharge,
          printing: printingCharge,
          gst: safeNum(orderData.gst, 0),
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          order = await Order.create({
            products: items,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: pfCharge,
            printing: printingCharge,
            gst: safeNum(orderData.gst, 0),
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      // ✅ Handle Printrove routing based on order type
      await handlePrintroveRouting(order, isCorporateOrder);

      const settings = await getOrCreateSingleton();
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, pfCharge, printingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (razorpay):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      return res.status(200).json({ success: true, order });
    }

    // ================================================================
    // CASE 4 – 50% PAY
    // ================================================================
    if (paymentmode === '50%') {
      console.warn('⚠️ Skipping Razorpay verification for 50% testing mode');
      payment = { id: paymentId || 'test_payment_id_50percent' };

      try {
        order = await Order.create({
          products: items,
          price: totalPay,
          totalPay: totalPay, // ✅ Add totalPay field for Printrove compatibility
          ...(addresses ? { addresses } : { address: legacyAddress }),
          user,
          razorpayPaymentId: payment.id,
          status: 'Pending',
          paymentmode: paymentmode, // ✅ Use enum value, not readableMode
          pf: pfCharge,
          printing: printingCharge,
          gst: safeNum(orderData.gst, 0),
          orderType,
          currency, // ✅ Customer's currency
          displayPrice, // ✅ Price in customer's currency
          conversionRate, // ✅ Conversion rate used
        });
      } catch (createError) {
        if (createError.code === 11000) {
          // Duplicate key error - retry with a new orderId
          console.warn('⚠️ Duplicate orderId detected, retrying...');
          order = await Order.create({
            products: items,
            price: totalPay,
            totalPay: totalPay,
            ...(addresses ? { addresses } : { address: legacyAddress }),
            user,
            razorpayPaymentId: payment.id,
            status: 'Pending',
            paymentmode: paymentmode, // ✅ Use enum value, not readableMode
            pf: pfCharge,
            printing: printingCharge,
            gst: safeNum(orderData.gst, 0),
            orderType,
            currency, // ✅ Customer's currency
            displayPrice, // ✅ Price in customer's currency
            conversionRate, // ✅ Conversion rate used
            orderId: `ORD-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`, // Force new orderId
          });
        } else {
          throw createError;
        }
      }

      try {
        await createTransaction(user, order._id, totalPay, '50%');
      } catch (error) {
        console.error('Wallet creation failed (halfpay):', error);
      }

      // ✅ Handle Printrove routing based on order type
      await handlePrintroveRouting(order, isCorporateOrder);

      const settings = await getOrCreateSingleton();
      const invoicePayload = buildInvoicePayload(order, orderData, addresses, legacyAddress, items, pfCharge, printingCharge, settings, orderType, paymentmode, totalPay);
      try {
        await createInvoice(invoicePayload);
      } catch (e) {
        console.error('Invoice creation failed (50%):', e);
      }

      // ✅ Clean up processing cache on success
      if (paymentId && paymentId !== 'manual_payment') {
        const cacheKey = `${paymentId}_${paymentmode}`;
        processingCache.delete(cacheKey);
      }

      return res.status(200).json({ success: true, order });
    }

    // ✅ fallback if paymentmode didn't match
    return res
      .status(400)
      .json({ success: false, message: 'Invalid payment mode' });
  } catch (err) {
    console.error('💥 completeOrder failed:', err);

    // ✅ Clean up processing cache on error
    if (paymentId && paymentId !== 'manual_payment') {
      const cacheKey = `${paymentId}_${paymentmode}`;
      processingCache.delete(cacheKey);
    }

    return res
      .status(500)
      .json({ success: false, message: err.message || 'Internal error' });
  }
};

// ================================================================
// GET ORDER BY ID (with design + product enrichment)
// ================================================================
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const enriched = await Promise.all(
      (order.products || []).map(async (p) => {
        const product = { ...p };
        if (p.design && typeof p.design === 'string') {
          const d = await Design.findById(p.design).lean();
          if (d) product.design = d.design;
        }
        if (p.design_data) product.design = p.design_data;

        product.name =
          p.name ||
          p.products_name ||
          p.product_name ||
          p.product?.products_name ||
          'Unnamed Product';
        return product;
      })
    );

    order.items = enriched;
    return res.status(200).json(order);
  } catch (err) {
    console.error('❌ getOrderById failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

// ================================================================
// GET ALL ORDERS (for Manage Orders dashboard)
// ================================================================
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    const enrichedOrders = await Promise.all(
      orders.map(async (o) => {
        const enrichedProducts = await Promise.all(
          (o.products || []).map(async (p) => {
            const product = { ...p };
            if (p.design && typeof p.design === 'string') {
              const d = await Design.findById(p.design).lean();
              if (d) product.design = d.design;
            }
            if (p.design_data) product.design = p.design_data;
            product.name =
              p.name ||
              p.products_name ||
              p.product_name ||
              p.product?.products_name ||
              'Unnamed Product';
            return product;
          })
        );
        return { ...o, items: enrichedProducts };
      })
    );

    return res.status(200).json(enrichedOrders);
  } catch (err) {
    console.error('❌ getAllOrders failed:', err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { completeOrder, getOrderById, getAllOrders };



