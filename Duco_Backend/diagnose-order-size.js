// Diagnose what's making orders huge
const mongoose = require('mongoose');
require('dotenv').config();

const USER_ID = '6973d357114bb3182b5aa5b5';

async function diagnose() {
  try {
    console.log('🔌 Connecting...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    // Get one order with BSON size
    const result = await mongoose.connection.db.collection('orders').aggregate([
      { $match: { user: new mongoose.Types.ObjectId(USER_ID) } },
      { $limit: 1 },
      {
        $project: {
          _id: 1,
          orderId: 1,
          productsCount: { $size: { $ifNull: ['$products', []] } },
          // Check each field size
          addressSize: { $strLenBytes: { $toString: '$address' } },
          productsSize: { $strLenBytes: { $toString: '$products' } },
          designImagesSize: { $strLenBytes: { $toString: { $ifNull: ['$designImages', ''] } } },
          previewImagesSize: { $strLenBytes: { $toString: { $ifNull: ['$previewImages', ''] } } }
        }
      }
    ]).toArray();

    if (result.length === 0) {
      console.log('❌ No orders found');
      await mongoose.disconnect();
      return;
    }

    console.log('📊 Order Analysis:');
    console.log(JSON.stringify(result[0], null, 2));

    // Now get the actual order to inspect products
    console.log('\n📦 Fetching full order...');
    const order = await mongoose.connection.db.collection('orders')
      .findOne({ user: new mongoose.Types.ObjectId(USER_ID) });

    console.log('\n🔍 Products array analysis:');
    if (order.products && Array.isArray(order.products)) {
      order.products.forEach((product, idx) => {
        const productStr = JSON.stringify(product);
        console.log(`\nProduct ${idx}:`);
        console.log(`  Total size: ${(productStr.length / 1024).toFixed(2)} KB`);
        console.log(`  Keys: ${Object.keys(product).join(', ')}`);
        
        // Check each key
        for (const [key, value] of Object.entries(product)) {
          const size = JSON.stringify(value).length;
          if (size > 1000) {
            console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`);
            
            // If it's image_url array
            if (key === 'image_url' && Array.isArray(value)) {
              console.log(`    Array length: ${value.length}`);
              if (value.length > 0) {
                const firstItem = JSON.stringify(value[0]);
                console.log(`    First item size: ${(firstItem.length / 1024).toFixed(2)} KB`);
                console.log(`    First item keys: ${Object.keys(value[0]).join(', ')}`);
              }
            }
          }
        }
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnose();
