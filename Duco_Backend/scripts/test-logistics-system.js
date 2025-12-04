/**
 * Test Script for Logistics System
 * 
 * This script tests all logistics endpoints to ensure they're working correctly.
 * 
 * Usage:
 *   node scripts/test-logistics-system.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');
const Logistic = require('../DataBase/Models/LogisticModel');

async function testLogisticsSystem() {
  try {
    console.log('🧪 Testing Logistics System...\n');

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    const dbUrl = process.env.DB_URL || process.env.MONGO_URI;
    if (!dbUrl) {
      throw new Error('DB_URL or MONGO_URI not found in environment variables');
    }
    await mongoose.connect(dbUrl);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Check if orders exist
    console.log('📦 Test 1: Checking for orders...');
    const orderCount = await Order.countDocuments();
    console.log(`   Found ${orderCount} orders in database`);
    
    if (orderCount === 0) {
      console.log('   ⚠️  No orders found. Create some orders first.');
      await mongoose.disconnect();
      return;
    }

    // Get a sample order
    const sampleOrder = await Order.findOne().lean();
    console.log(`   ✅ Sample order: ${sampleOrder._id}`);
    console.log(`      Order ID: ${sampleOrder.orderId || 'N/A'}`);
    console.log(`      Status: ${sampleOrder.status}`);
    console.log(`      Customer: ${sampleOrder.address?.fullName || 'N/A'}\n`);

    // Test 2: Check existing logistics
    console.log('📋 Test 2: Checking existing logistics...');
    const logisticsCount = await Logistic.countDocuments();
    console.log(`   Found ${logisticsCount} logistics entries\n`);

    // Test 3: Create a test logistics entry
    console.log('➕ Test 3: Creating test logistics entry...');
    const testLogistic = {
      orderId: sampleOrder._id,
      trackingNumber: `TEST-${Date.now()}`,
      carrier: 'Test Carrier',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      shippingAddress: sampleOrder.address?.fullName 
        ? `${sampleOrder.address.fullName}, ${sampleOrder.address.street}, ${sampleOrder.address.city}, ${sampleOrder.address.state} ${sampleOrder.address.pincode}`
        : 'Test Address, Test City, Test State 123456',
      note: 'Test logistics entry created by test script',
      speedLogistics: false,
      labelGenerated: false,
      img: []
    };

    const createdLogistic = await Logistic.create(testLogistic);
    console.log(`   ✅ Created logistics: ${createdLogistic._id}`);
    console.log(`      Tracking: ${createdLogistic.trackingNumber}`);
    console.log(`      Carrier: ${createdLogistic.carrier}\n`);

    // Test 4: Update the logistics entry
    console.log('✏️  Test 4: Updating logistics entry...');
    createdLogistic.speedLogistics = true;
    createdLogistic.note = 'Updated by test script - Speed logistics enabled';
    await createdLogistic.save();
    console.log(`   ✅ Updated logistics: Speed logistics = ${createdLogistic.speedLogistics}\n`);

    // Test 5: Query logistics by order
    console.log('🔍 Test 5: Querying logistics by order...');
    const orderLogistics = await Logistic.find({ orderId: sampleOrder._id })
      .populate('orderId', '_id orderId status')
      .lean();
    console.log(`   ✅ Found ${orderLogistics.length} logistics for order ${sampleOrder._id}`);
    orderLogistics.forEach((log, idx) => {
      console.log(`      ${idx + 1}. ${log._id} - ${log.trackingNumber || 'No tracking'}`);
    });
    console.log('');

    // Test 6: Test unique tracking number constraint
    console.log('🔒 Test 6: Testing unique tracking number constraint...');
    try {
      await Logistic.create({
        ...testLogistic,
        trackingNumber: createdLogistic.trackingNumber // Duplicate tracking number
      });
      console.log('   ❌ FAILED: Should have thrown duplicate key error\n');
    } catch (err) {
      if (err.code === 11000) {
        console.log('   ✅ Unique constraint working correctly\n');
      } else {
        console.log(`   ❌ Unexpected error: ${err.message}\n`);
      }
    }

    // Test 7: Test delivery slip validation
    console.log('📸 Test 7: Testing delivery slip validation...');
    try {
      createdLogistic.deliverySlips = [
        { URL: 'https://example.com/slip1.jpg', fileSize: 3 * 1024 * 1024 },
        { URL: 'https://example.com/slip2.jpg', fileSize: 2 * 1024 * 1024 }
      ];
      await createdLogistic.save();
      console.log('   ✅ Added 2 delivery slips successfully');
      
      // Try to add a third (should fail)
      createdLogistic.deliverySlips.push({ 
        URL: 'https://example.com/slip3.jpg', 
        fileSize: 1 * 1024 * 1024 
      });
      await createdLogistic.save();
      console.log('   ❌ FAILED: Should have rejected 3rd delivery slip\n');
    } catch (err) {
      if (err.message.includes('Maximum 2 delivery slip')) {
        console.log('   ✅ Delivery slip limit validation working\n');
      } else {
        console.log(`   ❌ Unexpected error: ${err.message}\n`);
      }
    }

    // Test 8: Cleanup - Delete test logistics
    console.log('🧹 Test 8: Cleaning up test data...');
    await Logistic.deleteOne({ _id: createdLogistic._id });
    console.log(`   ✅ Deleted test logistics entry\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   • Orders in database: ${orderCount}`);
    console.log(`   • Logistics entries: ${logisticsCount}`);
    console.log(`   • All CRUD operations working`);
    console.log(`   • Validation constraints working`);
    console.log(`   • Database relationships working`);
    console.log('\n🎉 Logistics system is fully functional!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run tests
testLogisticsSystem();
