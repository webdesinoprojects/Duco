const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');

// MongoDB connection
const MONGO_URI = "mongodb+srv://demouser:P9wlJT7A5x8nBJ@cluster0.qkntu.mongodb.net/Duco?retryWrites=true&w=majority";

async function checkOrder() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find the POLO-02 order
    const order = await Order.findOne({ orderId: 'POLO-02' });
    
    if (!order) {
      console.log('❌ Order POLO-02 not found');
      return;
    }

    console.log('📦 Order POLO-02 Details:\n');
    console.log(`  Order ID: ${order.orderId}`);
    console.log(`  Payment Mode: ${order.paymentmode}`);
    console.log(`  Payment Status: ${order.paymentStatus}`);
    console.log(`\n💰 Payment Amounts:`);
    console.log(`  totalAmount: ₹${order.totalAmount || 'NOT SET'}`);
    console.log(`  totalPay: ₹${order.totalPay || 'NOT SET'}`);
    console.log(`  price: ₹${order.price || 'NOT SET'}`);
    console.log(`  advancePaidAmount: ₹${order.advancePaidAmount || 'NOT SET'}`);
    console.log(`  remainingAmount: ₹${order.remainingAmount || 'NOT SET'}`);
    
    // Calculate what the values SHOULD be
    const correctTotal = order.totalPay || order.totalAmount || order.price || 0;
    const correctAdvance = Number((correctTotal / 2).toFixed(2));
    const correctRemaining = Number((correctTotal - correctAdvance).toFixed(2));
    
    console.log(`\n✅ Correct Values (50% split):`);
    console.log(`  Total: ₹${correctTotal}`);
    console.log(`  Advance (50%): ₹${correctAdvance}`);
    console.log(`  Remaining (50%): ₹${correctRemaining}`);
    
    // Check if values are wrong
    const advanceWrong = Math.abs((order.advancePaidAmount || 0) - correctAdvance) > 0.01;
    const remainingWrong = Math.abs((order.remainingAmount || 0) - correctRemaining) > 0.01;
    
    if (advanceWrong || remainingWrong) {
      console.log(`\n⚠️  ISSUE DETECTED:`);
      if (advanceWrong) {
        console.log(`  - advancePaidAmount is ₹${order.advancePaidAmount} (should be ₹${correctAdvance})`);
      }
      if (remainingWrong) {
        console.log(`  - remainingAmount is ₹${order.remainingAmount} (should be ₹${correctRemaining})`);
      }
      
      console.log(`\n🔧 To fix this order, run: node fix-polo-02-payment.js`);
    } else {
      console.log(`\n✅ All payment amounts are correct!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkOrder();
