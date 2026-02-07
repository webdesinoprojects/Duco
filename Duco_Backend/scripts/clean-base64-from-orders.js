// Script to remove base64 images from existing orders in database
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');

async function cleanBase64FromOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB');

    console.log('📦 Fetching all orders...');
    const orders = await Order.find({});
    console.log(`📊 Found ${orders.length} orders to clean`);

    let cleanedCount = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const order of orders) {
      const sizeBefore = JSON.stringify(order).length;
      totalSizeBefore += sizeBefore;
      
      let modified = false;

      // Clean products array
      if (order.products && Array.isArray(order.products)) {
        order.products = order.products.map(product => {
          // Remove previewImages completely
          if (product.previewImages) {
            delete product.previewImages;
            modified = true;
          }

          // Remove base64 from design object
          if (product.design) {
            // Remove design.previewImages
            if (product.design.previewImages) {
              delete product.design.previewImages;
              modified = true;
            }

            // Remove uploadedImage from each side
            ['front', 'back', 'left', 'right'].forEach(side => {
              if (product.design[side] && product.design[side].uploadedImage) {
                delete product.design[side].uploadedImage;
                modified = true;
              }
            });
          }

          return product;
        });
      }

      // Clean items array (legacy field)
      if (order.items && Array.isArray(order.items)) {
        order.items = order.items.map(item => {
          if (item.previewImages) {
            delete item.previewImages;
            modified = true;
          }

          if (item.design) {
            if (item.design.previewImages) {
              delete item.design.previewImages;
              modified = true;
            }

            ['front', 'back', 'left', 'right'].forEach(side => {
              if (item.design[side] && item.design[side].uploadedImage) {
                delete item.design[side].uploadedImage;
                modified = true;
              }
            });
          }

          return item;
        });
      }

      if (modified) {
        await order.save();
        const sizeAfter = JSON.stringify(order).length;
        totalSizeAfter += sizeAfter;
        const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);
        
        cleanedCount++;
        console.log(`✅ Cleaned order ${order._id}: ${(sizeBefore / 1024).toFixed(1)}KB → ${(sizeAfter / 1024).toFixed(1)}KB (${reduction}% reduction)`);
      } else {
        totalSizeAfter += sizeBefore;
        console.log(`⏭️  Order ${order._id} already clean`);
      }
    }

    const totalReduction = ((totalSizeBefore - totalSizeAfter) / totalSizeBefore * 100).toFixed(1);
    console.log('\n📊 Summary:');
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Cleaned: ${cleanedCount}`);
    console.log(`   Total size before: ${(totalSizeBefore / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Total size after: ${(totalSizeAfter / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Total reduction: ${totalReduction}%`);
    console.log('\n✅ All orders cleaned successfully!');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning orders:', error);
    process.exit(1);
  }
}

cleanBase64FromOrders();
