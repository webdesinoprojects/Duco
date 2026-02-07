// Script to inspect actual order structure
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');

async function inspectOrder() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    console.log('📦 Fetching one order...');
    const order = await Order.findOne({}).lean();
    
    if (!order) {
      console.log('❌ No orders found');
      process.exit(0);
    }

    console.log('\n📋 Order ID:', order._id);
    console.log('📏 Total size:', (JSON.stringify(order).length / 1024).toFixed(2), 'KB');
    
    if (order.products && order.products.length > 0) {
      console.log('\n🔍 First Product Structure:');
      const product = order.products[0];
      console.log('  Keys:', Object.keys(product));
      console.log('  Product size:', (JSON.stringify(product).length / 1024).toFixed(2), 'KB');
      
      if (product.previewImages) {
        console.log('\n  ❌ HAS previewImages:');
        for (const [key, value] of Object.entries(product.previewImages)) {
          if (typeof value === 'string') {
            const isBase64 = value.startsWith('data:image');
            const size = (value.length / 1024).toFixed(2);
            console.log(`    ${key}: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${size} KB)`);
          }
        }
      }
      
      if (product.design) {
        console.log('\n  Design object keys:', Object.keys(product.design));
        
        ['front', 'back', 'left', 'right'].forEach(side => {
          if (product.design[side]) {
            console.log(`\n  ${side}:`);
            console.log('    Keys:', Object.keys(product.design[side]));
            
            if (product.design[side].uploadedImage) {
              const img = product.design[side].uploadedImage;
              const isBase64 = typeof img === 'string' && img.startsWith('data:image');
              const size = typeof img === 'string' ? (img.length / 1024).toFixed(2) : 'N/A';
              console.log(`    uploadedImage: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${size} KB)`);
            }
          }
        });
      }
      
      if (product.image_url && Array.isArray(product.image_url)) {
        console.log('\n  image_url array:');
        product.image_url.forEach((imgGroup, idx) => {
          console.log(`    [${idx}]:`, Object.keys(imgGroup));
          if (imgGroup.url && Array.isArray(imgGroup.url)) {
            imgGroup.url.forEach((url, urlIdx) => {
              if (typeof url === 'string') {
                const isBase64 = url.startsWith('data:image');
                const size = (url.length / 1024).toFixed(2);
                console.log(`      url[${urlIdx}]: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${size} KB)`);
              }
            });
          }
        });
      }
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectOrder();
