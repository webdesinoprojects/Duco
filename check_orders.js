const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ducoart');
    console.log('Connected to MongoDB');
    
    const Order = require('./Duco_Backend/DataBase/Models/OrderModel');
    const totalOrders = await Order.countDocuments();
    console.log('Total orders in database:', totalOrders);
    
    if (totalOrders > 0) {
      const recentOrders = await Order.find({}).sort({ createdAt: -1 }).limit(3).lean();
      console.log('Recent orders:');
      recentOrders.forEach((order, idx) => {
        const size = JSON.stringify(order).length;
        console.log(`  ${idx + 1}. Order ${order.orderId}: ${Math.round(size/1024)}KB`);
      });
    } else {
      console.log('No orders found in database - this explains why no base64 images were found');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkOrders();