const mongoose = require('mongoose');

async function check() {
  try {
    const dbUrl = 'mongodb+srv://developerduco:p2nDgP07paBQewdi@cluster0.sms0okt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    
    console.log('Connecting...');
    await mongoose.connect(dbUrl);
    console.log('Connected!\n');

    const userId = '6973d357114bb3182b5aa5b5';
    
    // Get one order
    const order = await mongoose.connection.db.collection('orders')
      .findOne({ user: new mongoose.Types.ObjectId(userId) });
    
    if (!order) {
      console.log('No orders found');
      await mongoose.disconnect();
      return;
    }

    console.log('Order ID:', order.orderId);
    console.log('Products count:', order.products?.length || 0);
    
    if (order.products && order.products.length > 0) {
      const product = order.products[0];
      console.log('\nFirst product keys:', Object.keys(product));
      
      // Check each key size
      for (const [key, value] of Object.entries(product)) {
        const size = JSON.stringify(value).length;
        if (size > 1000) {
          console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`);
          
          if (key === 'image_url' && Array.isArray(value)) {
            console.log(`    - Array length: ${value.length}`);
            if (value.length > 0) {
              console.log(`    - First item keys:`, Object.keys(value[0]));
            }
          }
        }
      }
    }

    await mongoose.disconnect();
    console.log('\nDone');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();
