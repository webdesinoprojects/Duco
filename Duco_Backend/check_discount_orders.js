const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  console.log('Connected to MongoDB');
  
  // Find orders with discount
  const ordersWithDiscount = await Order.find({ 
    'discount': { $exists: true, $ne: null } 
  }).sort({ createdAt: -1 }).limit(10);
  
  console.log(`\nFound ${ordersWithDiscount.length} orders with discount:\n`);
  ordersWithDiscount.forEach(o => {
    console.log(`Order ID: ${o.orderId}`);
    console.log(`Discount: ${JSON.stringify(o.discount)}`);
    console.log(`Total: ${o.total}`);
    console.log(`Created: ${o.createdAt}`);
    console.log('---');
  });
  
  // Also check total count
  const totalWithDiscount = await Order.countDocuments({ 
    'discount': { $exists: true, $ne: null } 
  });
  console.log(`\nTotal orders with discount in database: ${totalWithDiscount}`);
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
