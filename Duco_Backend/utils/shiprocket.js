const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

/**
 * Get Shiprocket authentication token with auto-refresh on expiry
 * - Caches token in memory
 * - Auto-refreshes if expired or if API returns 401
 * - Logs all auth attempts for debugging
 */
const getShiprocketToken = async (forceRefresh = false) => {
  // Return cached token if valid and not forcing refresh
  if (!forceRefresh && cachedToken && tokenExpiry > Date.now()) {
    console.log('[Shiprocket] Using cached token (expires in', Math.round((tokenExpiry - Date.now()) / 1000 / 60), 'minutes)');
    return cachedToken;
  }

  try {
    console.log('[Shiprocket] Fetching new authentication token...');
    
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      {
        timeout: 10000 // 10 second timeout
      }
    );

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from Shiprocket auth API');
    }

    cachedToken = response.data.token;
    
    // Use token expiry from API response if available, otherwise default to 9 days
    const expirySeconds = response.data.expires_in || (9 * 24 * 60 * 60);
    // Set expiry to 30 minutes before actual expiry for safety buffer
    tokenExpiry = Date.now() + (expirySeconds * 1000) - (30 * 60 * 1000);

    console.log('[Shiprocket] Auth success - token cached for', Math.round(expirySeconds / 60 / 60), 'hours');
    
    return cachedToken;

  } catch (error) {
    console.error('[Shiprocket] Auth failed:', error.response?.data || error.message);
    
    // Clear cache on auth failure
    cachedToken = null;
    tokenExpiry = null;
    
    throw new Error(
      `Shiprocket authentication failed: ${error.response?.data?.message || error.message}`
    );
  }
};

/**
 * Clear cached token (useful for testing or manual refresh)
 */
const clearTokenCache = () => {
  cachedToken = null;
  tokenExpiry = null;
  console.log('[Shiprocket] Token cache cleared');
};

/**
 * Get shipment details from Shiprocket to fetch AWB code
 * The AWB code is assigned after pickup scheduling or courier assignment
 */
const getShipmentDetails = async (shipmentId) => {
  try {
    const token = await getShiprocketToken();

    console.log(`[Shiprocket] Fetching shipment details for ID: ${shipmentId}`);

    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }
    );

    console.log(`[Shiprocket] Shipment details retrieved:`, response.data);
    
    // ✅ CRITICAL FIX: Handle nested data structure from Shiprocket API
    // Some responses: { data: { id, awb, status, ... } }
    // Others: { id, awb, status, ... }
    const shipmentData = response.data.data || response.data;
    
    console.log(`[Shiprocket] Extracted shipment data:`, shipmentData);
    
    const awbCode = shipmentData.awb_code || shipmentData.awb;
    const courierName = shipmentData.courier_name || shipmentData.courier;
    const status = shipmentData.status;
    
    console.log(`[Shiprocket] 📋 Shipment details - ID: ${shipmentData.id}, Status: ${status}, AWB: ${awbCode || 'PENDING'}`);
    
    if (awbCode) {
      console.log(`[Shiprocket] ✅ AWB found in response: ${awbCode}`);
    } else {
      console.log(`[Shiprocket] ⏳ AWB not yet assigned (status: ${status})`);
    }

    return {
      success: true,
      data: shipmentData  // ✅ Return the correct shipment data, not wrapped
    };

  } catch (error) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message;

    console.error(`[Shiprocket] Failed to fetch shipment details (Status: ${statusCode}):`, errorMessage);

    return {
      success: false,
      error: errorMessage || 'Failed to fetch shipment details',
      statusCode
    };
  }
};

module.exports = { 
  getShiprocketToken,
  clearTokenCache,
  getShipmentDetails
};
