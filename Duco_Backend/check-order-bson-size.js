const mongoose = require('mongoose');
require('dotenv').config();

async function checkSize() {
  await mongoose.connect(process.env.DB_URL);
  
  const userId = '6973d357114bb3182b5aa5b5';
  
  // Get orders with their BSON size
  const orders = await mongoose.connection.db.collection('orders').aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $limit: 5 },
    {
      $project: {
        orderId: 1,
        bsonSize: { $bsonSize: '$$ROOT' },
        productsCount: { $size: { $ifNull: ['$products', []] } }
      }
    }
  ]).toArray();
  
  console.log('📊 Order BSON Sizes:');
  orders.forEach(order => {
    console.log(`Order ${order.orderId}: ${(order.bsonSize / 1024 / 1024).toFixed(2)} MB (${order.productsCount} products)`);
  });
  
  await mongoose.disconnect();
}

checkSize().catch(console.error);
