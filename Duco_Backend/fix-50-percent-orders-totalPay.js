const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./DataBase/Models/OrderModel');

/**
 * Fix 50% orders where totalPay is incorrectly set to advance amount
 * totalPay should always be the FULL order amount, not the advance
 */
async function fix50PercentOrderAmounts() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    console.log('━'.repeat(80));
    console.log('🔧 FIXING 50% ORDER AMOUNTS');
    console.log('━'.repeat(80));
    console.log();

    // Find all 50% orders
    const orders = await Order.find({ 
      paymentmode: '50%'
    }).sort({ createdAt: -1 });

    console.log(`Found ${orders.length} orders with 50% payment mode\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const order of orders) {
      const orderId = order.orderId || order._id;
      console.log(`\n📦 Order: ${orderId}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Current values:`);
      console.log(`   - price: ${order.price}`);
      console.log(`   - totalPay: ${order.totalPay || 'NOT SET'}`);
      console.log(`   - totalAmount: ${order.totalAmount || 'NOT SET'}`);
      console.log(`   - advancePaidAmount: ${order.advancePaidAmount || 'NOT SET'}`);
      console.log(`   - remainingAmount: ${order.remainingAmount || 'NOT SET'}`);

      // Calculate what totalPay should be
      let correctTotalPay = null;
      let needsUpdate = false;

      // If totalAmount is set, use it
      if (order.totalAmount && order.totalAmount > 0) {
        correctTotalPay = order.totalAmount;
      }
      // If totalAmount is not set but we have price (advance), calculate full amount
      else if (order.price > 0) {
        correctTotalPay = order.price * 2; // 50% means price is half of total
      }

      // Check if totalPay needs fixing
      if (correctTotalPay) {
        // totalPay is wrong if it's not set or equals the advance amount
        if (!order.totalPay || order.totalPay === order.price || 
            Math.abs(order.totalPay - correctTotalPay) > 0.01) {
          needsUpdate = true;
        }
      }

      if (needsUpdate && correctTotalPay) {
        console.log(`   ⚠️  totalPay is incorrect!`);
        console.log(`   ✅ Fixing:`);
        
        // Set totalPay to the full amount
        order.totalPay = correctTotalPay;
        
        // Also fix totalAmount if not set
        if (!order.totalAmount || order.totalAmount !== correctTotalPay) {
          order.totalAmount = correctTotalPay;
          console.log(`   - totalPay: ${order.price} → ${correctTotalPay}`);
          console.log(`   - totalAmount: ${order.totalAmount} → ${correctTotalPay}`);
        } else {
          console.log(`   - totalPay: ${order.totalPay || 'NOT SET'} → ${correctTotalPay}`);
        }
        
        // Fix advancePaidAmount if not set
        if (!order.advancePaidAmount || order.advancePaidAmount === 0) {
          order.advancePaidAmount = order.price;
          console.log(`   - advancePaidAmount: NOT SET → ${order.price}`);
        }
        
        // Fix remainingAmount
        const correctRemainingAmount = order.remainingPaymentId 
          ? 0 
          : Math.max(correctTotalPay - (order.advancePaidAmount || order.price), 0);
        
        if (!order.remainingAmount || Math.abs(order.remainingAmount - correctRemainingAmount) > 0.01) {
          order.remainingAmount = correctRemainingAmount;
          console.log(`   - remainingAmount: ${order.remainingAmount} → ${correctRemainingAmount}`);
        }
        
        await order.save();
        fixedCount++;
        console.log(`   ✅ FIXED!`);
      } else {
        console.log(`   ✅ Already correct`);
        alreadyCorrectCount++;
      }
    }

    console.log('\n' + '━'.repeat(80));
    console.log(`✅ Fix Complete!`);
    console.log(`   - ${fixedCount} orders FIXED`);
    console.log(`   - ${alreadyCorrectCount} orders already correct`);
    console.log(`   - ${orders.length} total orders checked`);
    console.log('━'.repeat(80));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fix50PercentOrderAmounts();
