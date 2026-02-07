// Quick scan of orders collection for base64 images
const mongoose = require('mongoose');
require('dotenv').config();

function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image');
}

function scanForBase64(obj, path = '', results = []) {
  if (!obj) return results;

  if (isBase64Image(obj)) {
    results.push({
      path,
      size: obj.length,
      sizeKB: (obj.length / 1024).toFixed(2),
      sizeMB: (obj.length / 1024 / 1024).toFixed(2),
      preview: obj.substring(0, 50) + '...'
    });
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

async function scanOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    console.log('🔍 Scanning ORDERS collection for base64 images...\n');

    const orders = await mongoose.connection.db.collection('orders')
      .find({})
      .toArray();

    console.log(`📦 Found ${orders.length} total orders\n`);

    let totalBase64 = 0;
    let totalSize = 0;
    let ordersWithBase64 = 0;

    orders.forEach((order, index) => {
      const base64Found = scanForBase64(order);
      
      if (base64Found.length > 0) {
        ordersWithBase64++;
        totalBase64 += base64Found.length;
        
        const orderSize = base64Found.reduce((sum, item) => sum + item.size, 0);
        totalSize += orderSize;

        console.log(`❌ Order ${index + 1}: ${order.orderId || order._id}`);
        console.log(`   User: ${order.user}`);
        console.log(`   Base64 count: ${base64Found.length}`);
        console.log(`   Total size: ${(orderSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Locations:`);
        
        base64Found.forEach(item => {
          console.log(`      - ${item.path} (${item.sizeKB} KB)`);
        });
        console.log('');
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 SCAN RESULTS');
    console.log('='.repeat(80));
    
    if (totalBase64 === 0) {
      console.log('\n✅ NO BASE64 IMAGES FOUND!');
      console.log('   All orders are clean - using Cloudinary URLs only.');
    } else {
      console.log(`\n❌ FOUND BASE64 IMAGES:`);
      console.log(`   - Total orders scanned: ${orders.length}`);
      console.log(`   - Orders with base64: ${ordersWithBase64}`);
      console.log(`   - Total base64 images: ${totalBase64}`);
      console.log(`   - Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   - Average per order: ${(totalSize / ordersWithBase64 / 1024 / 1024).toFixed(2)} MB`);
      
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Run migration script to upload to Cloudinary:');
      console.log('   node migrate-base64-to-cloudinary.js');
    }

    console.log('\n' + '='.repeat(80));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('🔍 ORDERS BASE64 SCANNER');
console.log('='.repeat(80));
console.log('Scanning orders collection for base64 images...');
console.log('='.repeat(80) + '\n');

scanOrders();
