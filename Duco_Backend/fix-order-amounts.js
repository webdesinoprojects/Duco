const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./DataBase/Models/OrderModel');

async function checkAndFixOrderAmounts() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    console.log('━'.repeat(80));
    console.log('🔍 Checking Order Amounts for Paid Orders');
    console.log('━'.repeat(80));
    console.log();

    // Find all paid 50% orders
    const orders = await Order.find({ 
      paymentmode: '50%',
      paymentStatus: 'paid'
    }).sort({ createdAt: -1 });

    console.log(`Found ${orders.length} paid 50% orders\n`);

    let fixedCount = 0;

    for (const order of orders) {
      const orderId = order.orderId || order._id;
      console.log(`\n📦 Order: ${orderId}`);
      console.log(`   Current values:`);
      console.log(`   - price: ${order.price}`);
      console.log(`   - totalPay: ${order.totalPay}`);
      console.log(`   - totalAmount: ${order.totalAmount}`);
      console.log(`   - remainingAmount: ${order.remainingAmount}`);
      console.log(`   - paymentStatus: ${order.paymentStatus}`);

      // If totalAmount is not set or is equal to price (advance payment)
      if (!order.totalAmount || order.totalAmount === order.price) {
        // Calculate total amount: advance + remaining that was paid
        const advanceAmount = Number(order.price || 0);
        const totalAmount = advanceAmount * 2; // 50% advance means total is double
        
        console.log(`   ⚠️  totalAmount is incorrect (${order.totalAmount})`);
        console.log(`   ✅ Fixing: Setting totalAmount to ${totalAmount}`);
        
        order.totalAmount = totalAmount;
        order.advancePaidAmount = totalAmount;
        await order.save();
        fixedCount++;
        
        console.log(`   ✅ Fixed!`);
      } else {
        console.log(`   ✅ totalAmount is correct (${order.totalAmount})`);
      }
    }

    console.log('\n' + '━'.repeat(80));
    console.log(`✅ Fix Complete: ${fixedCount} orders updated`);
    console.log('━'.repeat(80));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkAndFixOrderAmounts();
