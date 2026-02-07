// Script to check specific user's orders for base64
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');

const USER_ID = '6973d357114bb3182b5aa5b5'; // From logs

async function checkUserOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    console.log(`\n📦 Fetching orders for user: ${USER_ID}`);
    const orders = await Order.find({ user: USER_ID }).lean();
    
    console.log(`📊 Found ${orders.length} orders for this user\n`);

    let totalSize = 0;
    let ordersWithBase64 = 0;

    for (const order of orders) {
      const size = JSON.stringify(order).length;
      totalSize += size;
      
      let hasBase64 = false;
      const base64Fields = [];

      // Check products array
      if (order.products && Array.isArray(order.products)) {
        for (const product of order.products) {
          if (product.previewImages) {
            for (const [key, value] of Object.entries(product.previewImages)) {
              if (typeof value === 'string' && value.startsWith('data:image')) {
                hasBase64 = true;
                base64Fields.push(`products.previewImages.${key}`);
              }
            }
          }

          if (product.design) {
            ['front', 'back', 'left', 'right'].forEach(side => {
              if (product.design[side] && product.design[side].uploadedImage) {
                const img = product.design[side].uploadedImage;
                if (typeof img === 'string' && img.startsWith('data:image')) {
                  hasBase64 = true;
                  base64Fields.push(`products.design.${side}.uploadedImage`);
                }
              }
            });
          }
        }
      }

      if (hasBase64) {
        ordersWithBase64++;
        console.log(`❌ Order ${order._id}:`);
        console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);
        console.log(`   Base64 fields: ${base64Fields.join(', ')}`);
      } else {
        console.log(`✅ Order ${order._id}: ${(size / 1024).toFixed(2)} KB (clean)`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Orders with base64: ${ordersWithBase64}`);
    console.log(`   Clean orders: ${orders.length - ordersWithBase64}`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Average size: ${(totalSize / orders.length / 1024).toFixed(2)} KB per order`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUserOrders();
