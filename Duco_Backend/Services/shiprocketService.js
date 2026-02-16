const axios = require("axios");
const { getShiprocketToken } = require("../utils/shiprocket");

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
 * Schedule pickup for a shipment (optional feature)
 * Only called if SHIPROCKET_AUTO_PICKUP=true
 */
const schedulePickup = async (shipmentId) => {
  // Skip if auto-pickup is disabled
  if (process.env.SHIPROCKET_AUTO_PICKUP !== 'true') {
    console.log('[Shiprocket] Auto-pickup disabled, skipping pickup scheduling');
    return { success: true, skipped: true };
  }

  try {
    const token = await getShiprocketToken();
    
    console.log(`[Shiprocket] Scheduling pickup for shipment: ${shipmentId}`);
    
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/shipments/request-pickup",
      {
        shipment_id: shipmentId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }
    );

    console.log('[Shiprocket] Pickup scheduled successfully:', response.data);
    
    return {
      success: true,
      data: response.data
    };

  } catch (err) {
    console.error('[Shiprocket] Pickup scheduling failed:', err.response?.data || err.message);
    
    // Don't fail the entire order if pickup scheduling fails
    return {
      success: false,
      error: err.response?.data?.message || 'Pickup scheduling failed',
      nonCritical: true // Indicates this error shouldn't block order
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

    order_items: order.products.map((p, i) => ({
      name: p.name || `Item-${i + 1}`,
      sku: p.sku || `SKU-${i + 1}`,
      units: p.qty || 1,
      selling_price: Number(p.price),
    })),

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
      const pickupResult = await schedulePickup(shipmentId);
      if (pickupResult.success && !pickupResult.skipped) {
        console.log('[Shiprocket] Pickup scheduled for shipment:', shipmentId);
      }
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

module.exports = { 
  createShiprocketOrder,
  schedulePickup 
};
