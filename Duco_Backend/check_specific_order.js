const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  const order = await Order.findOne({ orderId: '698fab424ad2a944215b6f24' });
  
  if (order) {
    console.log('\nOrder Details:');
    console.log('Order ID:', order.orderId);
    console.log('Created At:', order.createdAt);
    console.log('Total:', order.total);
    console.log('Discount:', order.discount);
    console.log('Payment Mode:', order.paymentmode);
    console.log('\nFull Order Object (discount field):', JSON.stringify({
      discount: order.discount,
      hasDiscountField: order.hasOwnProperty('discount')
    }, null, 2));
  } else {
    console.log('Order not found');
  }
  
  mongoose.connection.close();
});
