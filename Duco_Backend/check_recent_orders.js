const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  console.log('Connected to MongoDB\n');
  
  // Get most recent 5 orders
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('orderId total discount paymentmode createdAt');
  
  console.log(`Recent Orders (${recentOrders.length}):\n`);
  recentOrders.forEach((order, idx) => {
    console.log(`${idx + 1}. Order ID: ${order.orderId}`);
    console.log(`   Total: ${order.total}`);
    console.log(`   Payment: ${order.paymentmode}`);
    console.log(`   Discount: ${order.discount ? JSON.stringify(order.discount) : 'null'}`);
    console.log(`   Created: ${order.createdAt}`);
    console.log('');
  });
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
