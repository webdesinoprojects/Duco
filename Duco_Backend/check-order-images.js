// Check what image data exists in orders
const mongoose = require('mongoose');
require('dotenv').config();

async function checkImages() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('🔍 Checking order image data...\n');

    const orders = await mongoose.connection.db.collection('orders')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    orders.forEach((order, idx) => {
      console.log(`\n📦 Order ${idx + 1}: ${order.orderId}`);
      console.log(`   Status: ${order.status}`);
      
      // Check products array
      if (order.products && order.products.length > 0) {
        const product = order.products[0];
        console.log(`   Products count: ${order.products.length}`);
        console.log(`   First product:`);
        console.log(`      - name: ${product.name || product.products_name || product.product_name}`);
        console.log(`      - image: ${product.image ? product.image.substring(0, 60) + '...' : 'MISSING'}`);
        
        if (product.image_url) {
          if (Array.isArray(product.image_url)) {
            console.log(`      - image_url: Array with ${product.image_url.length} items`);
            if (product.image_url.length > 0 && product.image_url[0]) {
              const firstUrl = product.image_url[0];
              if (typeof firstUrl === 'object' && firstUrl.url) {
                console.log(`         First item url: ${Array.isArray(firstUrl.url) ? firstUrl.url[0]?.substring(0, 60) : firstUrl.url?.substring(0, 60)}`);
              } else {
                console.log(`         First item: ${JSON.stringify(firstUrl).substring(0, 60)}`);
              }
            }
          } else {
            console.log(`      - image_url: ${product.image_url.substring(0, 60)}`);
          }
        } else {
          console.log(`      - image_url: MISSING`);
        }

        if (product.design) {
          console.log(`      - design: ${JSON.stringify(Object.keys(product.design))}`);
        }

        if (product.previewImages) {
          console.log(`      - previewImages: ${JSON.stringify(Object.keys(product.previewImages))}`);
        }
      } else {
        console.log(`   ❌ No products array!`);
      }

      // Check designImages
      if (order.designImages) {
        if (typeof order.designImages === 'object' && !Array.isArray(order.designImages)) {
          console.log(`   designImages (object): ${JSON.stringify(Object.keys(order.designImages))}`);
          if (order.designImages.front) {
            console.log(`      - front: ${order.designImages.front.substring(0, 60)}...`);
          }
        } else if (Array.isArray(order.designImages)) {
          console.log(`   designImages (array): ${order.designImages.length} items`);
        }
      }
    });

    await mongoose.disconnect();
    console.log('\n✅ Done');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkImages();
