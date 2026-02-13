const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  console.log('Connected to MongoDB\n');
  
  // List all collections
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  collections.forEach(col => console.log(`- ${col.name}`));
  
  // Check orders count
  const ordersCol = mongoose.connection.db.collection('orders');
  const orderCount = await ordersCol.countDocuments();
  console.log(`\nTotal documents in orders collection: ${orderCount}`);
  
  if (orderCount > 0) {
    const recentOrders = await ordersCol.find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log('\nRecent orders:');
    recentOrders.forEach(o => {
      console.log(`- Order: ${o.orderId || o._id}, Total: ${o.total}, Discount: ${JSON.stringify(o.discount)}`);
    });
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
