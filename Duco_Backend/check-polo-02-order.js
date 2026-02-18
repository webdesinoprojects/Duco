const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./DataBase/Models/OrderModel');

async function checkSpecificOrder() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find the POLO-02 order (ID from screenshot: #6995f411914df4a9cda218a7)
    const order = await Order.findById('6995f411914df4a9cda218a7');

    if (!order) {
      console.log('❌ Order not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📦 Order Details:');
    console.log('━'.repeat(60));
    console.log(`Order ID: ${order._id}`);
    console.log(`Order Number: ${order.orderId || 'N/A'}`);
    console.log(`Payment Mode: ${order.paymentmode}`);
    console.log(`Payment Status: ${order.paymentStatus}`);
    console.log('');
    console.log('💰 Amount Fields:');
    console.log(`  price: ₹${order.price} (amount paid in first transaction)`);
    console.log(`  totalPay: ₹${order.totalPay || 'NOT SET'} (FULL order amount)`);
    console.log(`  totalAmount: ₹${order.totalAmount || 'NOT SET'} (FULL order amount)`);
    console.log(`  advancePaidAmount: ₹${order.advancePaidAmount || 'NOT SET'}`);
    console.log(`  remainingAmount: ₹${order.remainingAmount || 'NOT SET'}`);
    console.log(`  remainingPaymentId: ${order.remainingPaymentId || 'NOT SET'}`);
    console.log('');
    console.log('✅ Admin Panel Should Show:');
    console.log(`  Total: ₹${order.totalPay || order.totalAmount || order.price}`);
    console.log(`  Status: ${order.remainingPaymentId || order.remainingAmount === 0 ? 'Fully Paid ✅' : 'Partial Payment 💰'}`);
    console.log('━'.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkSpecificOrder();
