require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');

mongoose.connect(process.env.DB_URL)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Find order with this shipmentId
    const order = await Order.findOne(
      { 'shiprocket.shipmentId': '1187285031' },
      'orderId status shiprocket createdAt'
    ).lean();

    if (order) {
      console.log('\n📦 Order found with Shiprocket shipment:\n');
      console.log('Order ID:', order.orderId);
      console.log('Status:', order.status);
      console.log('Created:', order.createdAt);
      console.log('\nShiprocket Data:');
      console.log(JSON.stringify(order.shiprocket, null, 2));
    } else {
      console.log('No order found with shipmentId: 1187285031');
    }

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
