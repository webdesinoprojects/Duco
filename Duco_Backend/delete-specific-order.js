require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

async function deleteSpecificOrder() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    // First, let's see all B2B Shipped orders
    console.log('\n🔍 Searching for all B2B Shipped orders...\n');
    const shippedOrders = await Order.find({
      status: 'Shipped',
      orderType: 'B2B'
    }).limit(20);

    console.log(`Found ${shippedOrders.length} B2B Shipped orders:\n`);
    shippedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order._id}`);
      console.log(`   Order #: ${order.orderId || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Products: ${order.products?.map(p => p.name || p.products_name).join(', ')}`);
      console.log('');
    });

    // Now search for "Round" or "RD-08" or "RD08"
    console.log('\n🔍 Searching for orders with "Round" or "RD" in product name...\n');
    const roundOrders = await Order.find({
      $or: [
        { 'products.name': { $regex: /round/i } },
        { 'products.products_name': { $regex: /round/i } },
        { 'products.name': { $regex: /rd-?08/i } },
        { 'products.products_name': { $regex: /rd-?08/i } }
      ]
    });

    console.log(`Found ${roundOrders.length} orders with "Round" or "RD":\n`);
    roundOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order._id}`);
      console.log(`   Order #: ${order.orderId || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Type: ${order.orderType || 'N/A'}`);
      console.log(`   Products: ${order.products?.map(p => p.name || p.products_name).join(', ')}`);
      console.log('');
    });

    if (roundOrders.length === 0 && shippedOrders.length === 0) {
      console.log('❌ No orders found. Please check the order details manually.');
      process.exit(0);
    }

    console.log('\n⚠️  Please review the orders above and confirm which one to delete.');
    console.log('⚠️  Run this script again after confirming the exact order ID.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteSpecificOrder();
