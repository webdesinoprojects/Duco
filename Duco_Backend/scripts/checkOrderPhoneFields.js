require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('../DataBase/DBConnection');
const Order = require('../DataBase/Models/OrderModel');

const ORDER_ID = '69934fc2c2904177017be22d';
const PHONE_KEYS = ['phone', 'mobile', 'contact', 'number'];

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const scanForPhoneFields = (value, path = []) => {
  const results = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      results.push(...scanForPhoneFields(item, path.concat(index)));
    });
    return results;
  }

  if (!isPlainObject(value)) {
    return results;
  }

  Object.entries(value).forEach(([key, val]) => {
    const nextPath = path.concat(key);
    const keyLower = key.toLowerCase();

    if (PHONE_KEYS.some((needle) => keyLower.includes(needle))) {
      results.push({
        path: nextPath.join('.'),
        value: val
      });
    }

    if (Array.isArray(val) || isPlainObject(val)) {
      results.push(...scanForPhoneFields(val, nextPath));
    }
  });

  return results;
};

const run = async () => {
  try {
    await connectDb();

    const order = await Order.findById(ORDER_ID).lean();

    if (!order) {
      console.log('Order not found for _id:', ORDER_ID);
      return;
    }

    console.log('Full Order JSON:');
    console.log(JSON.stringify(order, null, 2));

    const matches = scanForPhoneFields(order);

    console.log('\nPhone-like fields found:');
    if (matches.length === 0) {
      console.log('(none)');
    } else {
      matches.forEach((match) => {
        console.log(`- ${match.path}:`, match.value);
      });
    }
  } catch (error) {
    console.error('Error inspecting order:', error.message);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing database connection:', closeError.message);
    }
  }
};

run();
