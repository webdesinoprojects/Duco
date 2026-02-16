require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('../DataBase/DBConnection');
const Order = require('../DataBase/Models/OrderModel');

const ORDER_ID = '69934fc2c2904177017be22d';

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const run = async () => {
  try {
    await connectDb();

    const order = await Order.findById(ORDER_ID).lean();

    if (!order) {
      console.log('Order not found for _id:', ORDER_ID);
      return;
    }

    const shipping = order.addresses && order.addresses.shipping ? order.addresses.shipping : null;

    console.log('Order ID:', order.orderId || '(missing orderId)');
    console.log('Shipping Address Object:', shipping);

    const keys = shipping ? Object.keys(shipping) : [];
    console.log('Shipping Address Keys:', keys);

    console.log('Has mobileNumber:', hasOwn(shipping, 'mobileNumber'));
    console.log('Has phone:', hasOwn(shipping, 'phone'));
    console.log('Has contact:', hasOwn(shipping, 'contact'));
    console.log('Has mobile:', hasOwn(shipping, 'mobile'));
  } catch (error) {
    console.error('Error checking shipping address:', error.message);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError.message);
    }
  }
};

run();
