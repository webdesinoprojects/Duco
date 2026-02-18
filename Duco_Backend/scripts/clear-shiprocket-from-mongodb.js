/**
 * CLEAR SHIPROCKET DATA FROM MONGODB
 * Removes shiprocket field from all orders
 * 
 * Run: node clear-shiprocket-from-mongodb.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

// Connect to database
async function connectDB() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connected successfully\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

async function clearShiprocketData() {
  try {
    // Get the Order model
    const orderSchema = require('../DataBase/Models/OrderModel');
    
    console.log('🚀 CLEARING SHIPROCKET DATA FROM MONGODB');
    console.log('=========================================\n');

    // Find orders with shiprocket data
    const ordersWithShiprocket = await orderSchema.countDocuments({
      'shiprocket': { $exists: true, $ne: null }
    });

    console.log(`📊 Found ${ordersWithShiprocket} orders with Shiprocket data\n`);

    if (ordersWithShiprocket === 0) {
      console.log('✅ No Shiprocket data found. Already clean!\n');
      return;
    }

    console.log('🗑️  Removing Shiprocket data from all orders...\n');

    // Remove shiprocket field from all orders
    const result = await orderSchema.updateMany(
      { 'shiprocket': { $exists: true } },
      { $unset: { shiprocket: 1 } }
    );

    console.log('====================================');
    console.log('✅ Cleanup Complete');
    console.log(`   Orders updated: ${result.modifiedCount}`);
    console.log(`   Matched orders: ${result.matchedCount}`);
    console.log('====================================\n');

    console.log('📌 What was cleared:');
    console.log('   - shiprocket.shipmentId');
    console.log('   - shiprocket.awbCode');
    console.log('   - shiprocket.courierName');
    console.log('   - shiprocket.status');
    console.log('   - shiprocket.errorMessage');
    console.log('\n✅ Orders are now ready for fresh Shiprocket testing!\n');

  } catch (error) {
    console.error('❌ Error clearing data:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB disconnected\n');
  }
}

// Run the script
(async () => {
  try {
    await connectDB();
    await clearShiprocketData();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
})();
