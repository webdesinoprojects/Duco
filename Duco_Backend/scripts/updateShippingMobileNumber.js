require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('../DataBase/DBConnection');
const Order = require('../DataBase/Models/OrderModel');

const ORDER_ID = '69934fc2c2904177017be22d';
const TEST_MOBILE = '9876543210';

const run = async () => {
  try {
    await connectDb();

    const before = await Order.findById(ORDER_ID).lean();
    if (!before) {
      console.log('Order not found for _id:', ORDER_ID);
      return;
    }

    const beforeShipping = before.addresses && before.addresses.shipping ? before.addresses.shipping : null;
    console.log('Before shipping:', beforeShipping);

    await Order.updateOne(
      { _id: ORDER_ID },
      { $set: { 'addresses.shipping.mobileNumber': TEST_MOBILE } }
    );

    const after = await Order.findById(ORDER_ID).lean();
    const afterShipping = after && after.addresses && after.addresses.shipping ? after.addresses.shipping : null;
    console.log('After shipping:', afterShipping);

  } catch (error) {
    console.error('Error updating shipping mobile number:', error.message);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError.message);
    }
  }
};

run();
