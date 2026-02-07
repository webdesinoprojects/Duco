// URGENT: Clean base64 from specific user's orders
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');

const USER_ID = '6973d357114bb3182b5aa5b5'; // From logs

async function cleanUserOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    console.log(`\n🎯 Targeting user: ${USER_ID}`);
    console.log('📦 Fetching orders (this may take 30-60 seconds)...\n');
    
    const orders = await Order.find({ user: USER_ID });
    console.log(`✅ Found ${orders.length} orders\n`);

    let cleanedCount = 0;

    for (const order of orders) {
      const sizeBefore = JSON.stringify(order.toObject()).length;
      let modified = false;

      // Clean products array
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((product, idx) => {
          // Remove previewImages
          if (product.previewImages) {
            console.log(`  🧹 Removing previewImages from order ${order._id} product ${idx}`);
            product.previewImages = undefined;
            modified = true;
          }

          // Remove base64 from design
          if (product.design) {
            ['front', 'back', 'left', 'right'].forEach(side => {
              if (product.design[side] && product.design[side].uploadedImage) {
                const img = product.design[side].uploadedImage;
                if (typeof img === 'string' && img.startsWith('data:image')) {
                  console.log(`  🧹 Removing design.${side}.uploadedImage from order ${order._id} product ${idx}`);
                  product.design[side].uploadedImage = undefined;
                  modified = true;
                }
              }
            });
          }
        });
      }

      if (modified) {
        await order.save();
        const sizeAfter = JSON.stringify(order.toObject()).length;
        const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
        cleanedCount++;
        console.log(`✅ Cleaned order ${order._id}: ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% reduction)\n`);
      } else {
        console.log(`⏭️  Order ${order._id} already clean\n`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Cleaned: ${cleanedCount}`);
    console.log(`\n✅ Done! Now test /order page - should load in <2 seconds`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanUserOrders();
