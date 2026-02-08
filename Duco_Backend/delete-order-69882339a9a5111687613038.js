require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

async function deleteOrder() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    const orderId = '69882339a9a5111687613038';
    
    // Find the order
    const order = await Order.findById(orderId);
    
    if (!order) {
      console.log('❌ Order not found');
      process.exit(1);
    }

    console.log('📦 Order Details:');
    console.log(`   Order ID: ${order._id}`);
    console.log(`   Order #: ${order.orderId || 'N/A'}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Type: ${order.orderType || 'N/A'}`);
    console.log(`   Products: ${order.products?.map(p => p.name || p.products_name).join(', ')}`);
    console.log(`   Price: ${order.price}`);
    console.log(`   Created: ${order.createdAt}\n`);

    // Find and delete associated invoice
    const invoice = await Invoice.findOne({ order: order._id });
    if (invoice) {
      await Invoice.deleteOne({ _id: invoice._id });
      console.log(`✅ Deleted invoice ${invoice._id}`);
    } else {
      console.log('ℹ️  No invoice found for this order');
    }

    // Delete the order
    await Order.deleteOne({ _id: order._id });
    console.log(`✅ Deleted order ${order._id}\n`);

    console.log('✅ Order and associated data successfully deleted!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteOrder();
