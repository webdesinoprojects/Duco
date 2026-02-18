/**
 * DELETE ALL SHIPROCKET SHIPMENTS SCRIPT
 * Use this to clean up Shiprocket for testing purposes
 * 
 * Run: node delete-all-shiprocket-shipments.js
 */

require('dotenv').config({ path: '.env' });
const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

async function getShiprocketToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && tokenExpiry > Date.now()) {
    console.log('[Auth] Using cached token');
    return cachedToken;
  }

  try {
    console.log('[Auth] Fetching new authentication token...');
    
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      },
      { timeout: 10000 }
    );

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from Shiprocket auth API');
    }

    cachedToken = response.data.token;
    const expirySeconds = response.data.expires_in || (9 * 24 * 60 * 60);
    tokenExpiry = Date.now() + (expirySeconds * 1000) - (30 * 60 * 1000);

    console.log('✅ [Auth] Authentication successful');
    return cachedToken;

  } catch (error) {
    console.error('❌ [Auth] Failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getAllShipments(page = 1, allShipments = []) {
  try {
    const token = await getShiprocketToken();
    
    console.log(`📦 [Fetch] Fetching shipments (page ${page})...`);
    
    const response = await axios.get(
      `https://apiv2.shiprocket.in/v1/external/shipments?page=${page}&channel_id=${process.env.SHIPROCKET_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000
      }
    );

    if (!response.data || !response.data.data) {
      console.log('✅ No more shipments found');
      return allShipments;
    }

    const shipments = response.data.data.shipments || [];
    console.log(`✅ Found ${shipments.length} shipments on page ${page}`);
    
    allShipments = [...allShipments, ...shipments];

    // Check if there are more pages
    if (response.data.data.count > allShipments.length) {
      return getAllShipments(page + 1, allShipments);
    }

    return allShipments;

  } catch (error) {
    console.error(`❌ [Fetch] Error fetching shipments:`, error.response?.data || error.message);
    throw error;
  }
}

async function deleteShipment(shipmentId) {
  try {
    const token = await getShiprocketToken();
    
    const response = await axios.post(
      `https://apiv2.shiprocket.in/v1/external/shipments/${shipmentId}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }
    );

    console.log(`  ✅ Cancelled shipment ID: ${shipmentId}`);
    return true;

  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  ⚠️ Shipment ${shipmentId} already deleted or not found`);
      return true;
    }
    console.error(`  ❌ Error cancelling shipment ${shipmentId}:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function main() {
  console.log('\n🚀 SHIPROCKET SHIPMENT CLEANUP SCRIPT');
  console.log('=====================================\n');

  try {
    // Verify credentials
    console.log('📋 Verifying Shiprocket credentials...');
    console.log(`   Email: ${process.env.SHIPROCKET_EMAIL}`);
    console.log(`   Channel ID: ${process.env.SHIPROCKET_CHANNEL_ID}`);
    console.log(`   Pickup Location: ${process.env.SHIPROCKET_PICKUP_LOCATION}\n`);

    // Get auth token
    await getShiprocketToken();

    // Fetch all shipments
    console.log('🔍 Fetching all shipments...\n');
    const allShipments = await getAllShipments();

    if (allShipments.length === 0) {
      console.log('✅ No shipments found. Nothing to delete!\n');
      return;
    }

    console.log(`\n📊 Total shipments to delete: ${allShipments.length}\n`);
    console.log('🗑️  Deleting shipments...\n');

    let successCount = 0;
    let failureCount = 0;

    for (const shipment of allShipments) {
      const success = await deleteShipment(shipment.id);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Deletion Complete`);
    console.log(`   Successfully deleted: ${successCount}`);
    console.log(`   Failed/Errors: ${failureCount}`);
    console.log(`   Total processed: ${successCount + failureCount}`);
    console.log(`${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
