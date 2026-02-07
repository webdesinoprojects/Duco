const mongoose = require('mongoose');
require('dotenv').config();

const USER_ID = '6973d357114bb3182b5aa5b5';

async function cleanOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    console.log('🧹 Cleaning orders for user:', USER_ID);
    console.log('This will remove:');
    console.log('  - products[].image_url (keep only first item)');
    console.log('  - products[].design');
    console.log('  - products[].previewImages');
    console.log('  - Any base64 strings\n');

    // Get all orders for this user
    const orders = await mongoose.connection.db.collection('orders')
      .find({ user: new mongoose.Types.ObjectId(USER_ID) })
      .toArray();

    console.log(`📦 Found ${orders.length} orders\n`);

    let cleaned = 0;
    let totalSizeBefore = 0;
    let totalSizeAfter = 0;

    for (const order of orders) {
      const sizeBefore = JSON.stringify(order).length;
      totalSizeBefore += sizeBefore;
      
      let modified = false;
      
      // Clean products array
      if (order.products && Array.isArray(order.products)) {
        order.products = order.products.map(product => {
          // Keep only essential fields
          const cleaned = {
            _id: product._id,
            name: product.name || product.products_name || product.product_name,
            products_name: product.products_name,
            product_name: product.product_name,
            price: product.price,
            quantity: product.quantity,
            size: product.size,
            color: product.color,
            // Keep ONLY first image if image_url exists
            image: product.image,
            image_url: Array.isArray(product.image_url) && product.image_url.length > 0 
              ? [product.image_url[0]] 
              : product.image_url
          };
          
          modified = true;
          return cleaned;
        });
      }
      
      // Remove any base64 from designImages
      if (order.designImages && Array.isArray(order.designImages)) {
        order.designImages = order.designImages.map(img => {
          if (typeof img === 'string' && img.startsWith('data:image')) {
            modified = true;
            return null; // Remove base64
          }
          return img;
        }).filter(Boolean);
      }
      
      // Remove previewImages if it exists
      if (order.previewImages) {
        delete order.previewImages;
        modified = true;
      }
      
      if (modified) {
        const sizeAfter = JSON.stringify(order).length;
        totalSizeAfter += sizeAfter;
        
        console.log(`Order ${order.orderId}:`);
        console.log(`  Before: ${(sizeBefore / 1024).toFixed(2)} KB`);
        console.log(`  After: ${(sizeAfter / 1024).toFixed(2)} KB`);
        console.log(`  Saved: ${((sizeBefore - sizeAfter) / 1024).toFixed(2)} KB\n`);
        
        // Update the order
        await mongoose.connection.db.collection('orders').updateOne(
          { _id: order._id },
          { $set: { products: order.products, designImages: order.designImages, updatedAt: new Date() } },
          { $unset: { previewImages: 1 } }
        );
        
        cleaned++;
      } else {
        totalSizeAfter += sizeBefore;
      }
    }

    console.log('\n✅ Cleanup complete!');
    console.log(`📊 Cleaned ${cleaned} orders`);
    console.log(`📉 Total size before: ${(totalSizeBefore / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📉 Total size after: ${(totalSizeAfter / 1024 / 1024).toFixed(2)} MB`);
    console.log(`💾 Saved: ${((totalSizeBefore - totalSizeAfter) / 1024 / 1024).toFixed(2)} MB`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanOrders();
