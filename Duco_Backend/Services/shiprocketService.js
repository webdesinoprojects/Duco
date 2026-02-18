const axios = require("axios");
const { getShiprocketToken, getShipmentDetails } = require("../utils/shiprocket");

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Validate shipping address before API call
 */
const validateShippingAddress = (address) => {
  const required = ['fullName', 'city', 'pincode', 'state', 'mobileNumber'];
  const missing = required.filter(field => !address[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required shipping fields: ${missing.join(', ')}`
    };
  }

  // Validate pincode format (6 digits for India)
  if (!/^\d{6}$/.test(String(address.pincode))) {
    return {
      valid: false,
      error: 'Invalid pincode format (must be 6 digits)'
    };
  }

  // Validate mobile number (10 digits)
  const phone = String(address.mobileNumber).replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) {
    return {
      valid: false,
      error: 'Invalid mobile number (must be 10 digits)'
    };
  }

  return { valid: true };
};

/**
 * Validate order before creating shipment
 */
const validateOrder = (order) => {
  if (!order) {
    return { valid: false, error: 'Order object is required' };
  }

  if (!order.orderId) {
    return { valid: false, error: 'Order ID is required' };
  }

  if (!order.products || order.products.length === 0) {
    return { valid: false, error: 'Order must have at least one product' };
  }

  if (!order.paymentmode) {
    return { valid: false, error: 'Payment mode is required' };
  }

  if (!order.price || order.price <= 0) {
    return { valid: false, error: 'Order price must be greater than 0' };
  }

  return { valid: true };
};

// ========================================
// DEMO MODE
// ========================================

const getMockShiprocketResponse = (order) => {
  const randomAwb = Math.random().toString(36).substring(2, 15).toUpperCase();
  const randomShipmentId = Math.floor(Math.random() * 1000000000);

  return {
    shipment_id: randomShipmentId,
    awb_code: `MOCK${randomAwb}${Math.floor(Math.random() * 10000)}`,
    courier_name: "MockCourier (Demo Mode)",
    status: "pending",
  };
};

// ========================================
// PICKUP SCHEDULING
// ========================================

/**
 * Schedule pickup for a shipment
 * NOTE: Shiprocket API endpoints for auto-scheduling are deprecated/broken (404 errors)
 * AWB is ONLY assigned after manual pickup scheduling from Shiprocket Dashboard
 * This function is a placeholder for future enhancements
 */
const schedulePickup = async (shipmentId) => {
  // Auto-pickup via API is not available in current Shiprocket API
  // Users must schedule pickup manually from Shiprocket dashboard
  
  if (process.env.SHIPROCKET_AUTO_PICKUP !== 'true') {
    console.log('[Shiprocket] Auto-pickup disabled, skipping pickup scheduling');
    return { success: true, skipped: true };
  }

  try {
    console.log(`[Shiprocket] ⚠️ Note: Shiprocket API endpoints for auto-pickup are unavailable`);
    console.log(`[Shiprocket] 📋 AdminInstructions: Schedule pickup manually from Shiprocket dashboard`);
    console.log(`[Shiprocket] 🔗 URL: https://app.shiprocket.in → Orders → ${shipmentId} → Schedule Pickup`);
    
    return {
      success: true,
      skipped: true,
      message: 'Auto-pickup via API unavailable. Please schedule manually from Shiprocket dashboard.',
      requiresManualAction: true,
      shipmentId: shipmentId
    };

  } catch (err) {
    console.error('[Shiprocket] Pickup scheduling failed:', err.message);
    
    return {
      success: false,
      error: err.message,
      nonCritical: true
    };
  }
};

// ========================================
// MAIN SHIPMENT CREATION
// ========================================

/**
 * Create Shiprocket shipment order with retry logic and validation
 */
const createShiprocketOrder = async (order, isRetry = false) => {
  // ========================================
  // DEMO MODE
  // ========================================
  if (process.env.USE_MOCK_SHIPROCKET === "true") {
    console.log("[Shiprocket] 🎭 DEMO MODE ENABLED");
    return {
      success: true,
      data: getMockShiprocketResponse(order)
    };
  }

  // ========================================
  // VALIDATION
  // ========================================
  
  // Validate order
  const orderValidation = validateOrder(order);
  if (!orderValidation.valid) {
    console.error('[Shiprocket] Order validation failed:', orderValidation.error);
    return {
      success: false,
      error: orderValidation.error,
      validationError: true
    };
  }

  // Get shipping address with fallback
  const shippingAddress = order.addresses?.shipping || order.address;
  
  if (!shippingAddress) {
    console.error('[Shiprocket] No shipping address found');
    return {
      success: false,
      error: "Shipping address missing in order",
      validationError: true
    };
  }

  // ========================================
  // NORMALIZE PHONE FIELDS
  // ========================================
  // Normalize phone field: if mobileNumber is missing, use phone as fallback
  // This handles cases where order has phone but validation expects mobileNumber
  if (!shippingAddress.mobileNumber && shippingAddress.phone) {
    shippingAddress.mobileNumber = shippingAddress.phone;
    console.log('[Shiprocket] Normalized phone field: phone ->', shippingAddress.phone, '-> mobileNumber');
  }

  // Validate shipping address
  const addressValidation = validateShippingAddress(shippingAddress);
  if (!addressValidation.valid) {
    console.error('[Shiprocket] Address validation failed:', addressValidation.error);
    return {
      success: false,
      error: addressValidation.error,
      validationError: true
    };
  }

  // ========================================
  // CONFIGURATION (FROM ENV)
  // ========================================
  
  const channelId = process.env.SHIPROCKET_CHANNEL_ID || '5165297';
  const pickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION || '15540e81';

  // ========================================
  // BUILD PAYLOAD
  // ========================================

  const payload = {
    order_id: `${order.orderId}-${Date.now()}`,
    order_date: new Date(order.createdAt).toISOString().split("T")[0],
    channel_id: Number(channelId),
    pickup_location: pickupLocation,
    order_type: "ESSENTIALS",

    billing_customer_name: shippingAddress.fullName,
    billing_last_name: "",
    billing_address: `${shippingAddress.houseNumber || ''} ${shippingAddress.street || ''}`.trim(),
    billing_city: shippingAddress.city,
    billing_pincode: String(shippingAddress.pincode),
    billing_state: shippingAddress.state,
    billing_country: "India",
    billing_email: shippingAddress.email || 'support@ducoart.com',
    billing_phone: String(shippingAddress.mobileNumber).replace(/\D/g, '').slice(-10),

    shipping_is_billing: true,

    // ✅ CRITICAL FIX: Map actual order products instead of hardcoded dummy data
    order_items: order.products.map((p, i) => {
      // Handle quantity which can be either a number or an object like {S: 2, M: 3}
      let totalQuantity = 1;
      if (typeof p.quantity === 'object' && p.quantity) {
        // Sum all size quantities
        totalQuantity = Object.values(p.quantity).reduce((sum, q) => sum + Number(q || 0), 0);
      } else if (typeof p.quantity === 'number') {
        totalQuantity = p.quantity;
      } else if (p.qty) {
        totalQuantity = p.qty;
      }

      // Ensure at least 1 unit
      totalQuantity = Math.max(1, totalQuantity);

      return {
        // ✅ Use products_name (our actual field name), fallback to name
        name: p.products_name || p.name || `Item-${i + 1}`,
        // ✅ Generate SKU from product ID since we don't have a SKU field
        // Format: PRD-${productId} for uniqueness
        sku: p.sku || `PRD-${p._id || p.id || p.productId || `ITEM${i + 1}`}`,
        // ✅ Use correct quantity field with proper aggregation
        units: totalQuantity,
        // ✅ Use actual product price
        selling_price: Number(p.price || 0),
      };
    }),

    payment_method: order.paymentmode === "COD" ? "COD" : "Prepaid",
    sub_total: Number(order.price),

    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,

    length: 10,
    breadth: 10,
    height: 5,
    weight: 0.5,
  };

  // ========================================
  // API CALL WITH RETRY LOGIC
  // ========================================

  try {
    const token = await getShiprocketToken();

    console.log(`[Shiprocket] Creating shipment for order: ${order.orderId}`);
    
    // ✅ DEBUG: Log the actual order items being sent to Shiprocket
    console.log('[Shiprocket] 📦 Order Items being sent to Shiprocket:');
    payload.order_items.forEach((item, idx) => {
      console.log(`  [Item ${idx + 1}] ${item.name} | SKU: ${item.sku} | Qty: ${item.units} | Price: ₹${item.selling_price}`);
    });
    
    // ========================================
    // DEBUG: CONFIRM PHONE BEFORE SHIPROCKET
    // ========================================
    const billingPhoneDebug = String(shippingAddress.mobileNumber).replace(/\D/g, '').slice(-10);
    console.log('[Shiprocket] 📱 PHONE DEBUG: Sending billing_phone to Shiprocket:', billingPhoneDebug);
    console.log('[Shiprocket] 📱 PHONE DEBUG: Source - shippingAddress.mobileNumber:', shippingAddress.mobileNumber);
    
    console.log("[Shiprocket] Payload:", JSON.stringify(payload, null, 2));

    const url = "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc";
    console.log("[Shiprocket] Calling endpoint:", url);

    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000 // 15 second timeout
      }
    );

    console.log("[Shiprocket] FULL ORDER CREATE RESPONSE:", JSON.stringify(response.data, null, 2));

    console.log("[Shiprocket] Full adhoc response:", response.data);

    console.log("[Shiprocket] ✅ Shipment created successfully");
    console.log("[Shiprocket] Response:", JSON.stringify(response.data, null, 2));

    console.log("[Shiprocket] FULL ADHOC RESPONSE:", JSON.stringify(response.data, null, 2));

    // Schedule pickup if enabled
    const shipmentId = response.data.shipment_id;
    if (shipmentId) {
      console.log('[Shiprocket] 📋 Calling schedulePickup for shipment:', shipmentId);
      const pickupResult = await schedulePickup(shipmentId);
      
      if (pickupResult.success) {
        if (pickupResult.skipped) {
          console.log('[Shiprocket] ⏭️ Pickup scheduling skipped (auto-pickup disabled) for shipment:', shipmentId);
        } else {
          console.log('[Shiprocket] ✅ Pickup scheduled successfully for shipment:', shipmentId);
          console.log('[Shiprocket] Pickup details:', pickupResult.data);
        }
      } else {
        console.warn('[Shiprocket] ⚠️ Pickup scheduling failed (non-critical):', pickupResult.error);
        console.warn('[Shiprocket] Error details:', pickupResult.details);
        console.log('[Shiprocket] 💡 Tip: Try scheduling pickup manually from Shiprocket dashboard');
      }
    } else {
      console.warn('[Shiprocket] ⚠️ No shipmentId in response, skipping pickup scheduling');
    }

    return {
      success: true,
      data: response.data
    };

  } catch (err) {
    const statusCode = err.response?.status;
    const errorData = err.response?.data;
    const errorMessage = errorData?.message || err.message;

    console.error(`[Shiprocket] ❌ Shipment creation failed (Status: ${statusCode})`);
    console.error('[Shiprocket] Error details:', errorData || err.message);

    // ========================================
    // RETRY LOGIC
    // ========================================

    // Retry on 401 (token expired) - refresh token and retry once
    if (statusCode === 401 && !isRetry) {
      console.log('[Shiprocket] Token expired, refreshing and retrying...');
      try {
        await getShiprocketToken(true); // Force refresh
        return await createShiprocketOrder(order, true); // Retry once
      } catch (retryErr) {
        console.error('[Shiprocket] Retry after token refresh failed:', retryErr.message);
        return {
          success: false,
          error: 'Authentication failed after token refresh',
          statusCode: 401
        };
      }
    }

    // Retry on network errors or 5xx server errors (but not if already retrying)
    const isNetworkError = !statusCode || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
    const isServerError = statusCode >= 500 && statusCode < 600;
    
    if ((isNetworkError || isServerError) && !isRetry) {
      console.log('[Shiprocket] Network/server error detected, retrying once...');
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        return await createShiprocketOrder(order, true); // Retry once
      } catch (retryErr) {
        console.error('[Shiprocket] Retry failed:', retryErr.message);
        // Fall through to error return below
      }
    }

    // ========================================
    // STRUCTURED ERROR RESPONSE
    // ========================================

    // Don't retry on 4xx client errors (validation, duplicate, etc.)
    if (statusCode >= 400 && statusCode < 500) {
      return {
        success: false,
        error: errorMessage || 'Shiprocket validation error',
        statusCode,
        validationError: true,
        details: errorData
      };
    }

    // Generic error response
    return {
      success: false,
      error: errorMessage || "Shiprocket unavailable / service error",
      statusCode: statusCode || 500,
      details: errorData
    };
  }
};

/**
 * Fetch AWB code from Shiprocket for an existing shipment
 * Call this periodically or on-demand to get the tracking number after it's assigned
 * 
 * NOTE: This function ONLY FETCHES from Shiprocket API
 * Database persistence is handled by the calling function (e.g., OrderController.refetchTrackingId)
 */
const fetchAndUpdateAwbCode = async (shipmentId) => {
  try {
    console.log(`[Shiprocket] Fetching AWB code for shipment: ${shipmentId}`);

    const result = await getShipmentDetails(shipmentId);

    if (!result.success) {
      console.error(`[Shiprocket] Failed to get shipment details for ${shipmentId}:`, result.error);
      return {
        success: false,
        error: result.error,
        hasAwb: false
      };
    }

    const shipmentData = result.data;
    const awbCode = shipmentData.awb_code || shipmentData.awb || '';
    const courierName = shipmentData.courier_name || shipmentData.courier || '';
    const status = shipmentData.status || '';

    console.log(`[Shiprocket] 📊 Extracted from API response: awbCode='${awbCode}', courierName='${courierName}', status=${status}`);

    // ✅ Only log when AWB is found
    if (awbCode) {
      console.log(`[Shiprocket] ✅ Shipment ${shipmentId} status: ${status}, AWB: ${awbCode}`);
    } else {
      console.log(`[Shiprocket] ⏳ Shipment ${shipmentId} - AWB not assigned yet (status: ${status})`);
    }

    return {
      success: true,
      hasAwb: !!awbCode,
      awbCode,
      courierName,
      status,
      shipmentData
    };

  } catch (err) {
    console.error('[Shiprocket] Error fetching AWB code:', err.message);
    return {
      success: false,
      error: err.message,
      hasAwb: false
    };
  }
};

module.exports = { 
  createShiprocketOrder,
  schedulePickup,
  fetchAndUpdateAwbCode
};
