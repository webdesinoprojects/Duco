// Quick verification that no base64 images remain
const mongoose = require('mongoose');
require('dotenv').config();

function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image');
}

function scanForBase64(obj, path = '', results = []) {
  if (!obj) return results;

  if (isBase64Image(obj)) {
    results.push({ path, size: obj.length });
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanForBase64(item, `${path}[${index}]`, results);
    });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      scanForBase64(value, newPath, results);
    }
  }

  return results;
}

async function verify() {
  try {
    console.log('🔍 VERIFICATION: Checking for remaining base64 images...\n');
    
    await mongoose.connect(process.env.DB_URL);

    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
    
    let totalBase64 = 0;
    let ordersWithBase64 = [];

    orders.forEach(order => {
      const base64Found = scanForBase64(order);
      if (base64Found.length > 0) {
        totalBase64 += base64Found.length;
        ordersWithBase64.push({
          orderId: order.orderId,
          count: base64Found.length,
          locations: base64Found.map(b => b.path)
        });
      }
    });

    console.log('='.repeat(80));
    
    if (totalBase64 === 0) {
      console.log('✅ SUCCESS! NO BASE64 IMAGES FOUND IN DATABASE!');
      console.log('');
      console.log('All images have been successfully migrated to Cloudinary.');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Restart backend: npm run dev');
      console.log('  2. Test order page: http://localhost:5173/order');
      console.log('  3. Verify images display correctly');
      console.log('');
      console.log('Expected result: Order page loads in 2-5 seconds');
    } else {
      console.log(`❌ FOUND ${totalBase64} BASE64 IMAGES IN ${ordersWithBase64.length} ORDERS`);
      console.log('');
      ordersWithBase64.forEach(order => {
        console.log(`Order: ${order.orderId}`);
        console.log(`  Count: ${order.count}`);
        console.log(`  Locations: ${order.locations.join(', ')}`);
      });
      console.log('');
      console.log('⚠️  Migration may not have completed. Run again:');
      console.log('   node migrate-base64-to-cloudinary.js');
    }

    console.log('='.repeat(80));

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();
