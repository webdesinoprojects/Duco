const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ducoart');
    console.log('Connected to MongoDB');
    
    const Order = require('./DataBase/Models/OrderModel');
    const Design = require('./DataBase/Models/DesignModel');
    
    // Check orders with large design data
    const orders = await Order.find({}).limit(10).lean();
    console.log('\n=== ORDER ANALYSIS ===');
    console.log('Total orders:', await Order.countDocuments());
    
    let largeDesignCount = 0;
    let totalSize = 0;
    let base64Count = 0;
    
    for (const order of orders) {
      const orderSize = JSON.stringify(order).length;
      totalSize += orderSize;
      
      // Check if order contains base64 data
      const orderStr = JSON.stringify(order);
      if (orderStr.includes('data:image')) {
        base64Count++;
        console.log('Order with base64 data:', {
          orderId: order.orderId,
          size: Math.round(orderSize / 1024) + 'KB',
          hasDesignImages: !!order.designImages,
          productsCount: order.products?.length || 0
        });
        
        // Check products for base64 data
        if (order.products) {
          order.products.forEach((product, idx) => {
            const productStr = JSON.stringify(product);
            if (productStr.includes('data:image')) {
              const base64Matches = productStr.match(/data:image[^"']*/g) || [];
              console.log(`  Product ${idx} has ${base64Matches.length} base64 images, total size: ${Math.round(productStr.length / 1024)}KB`);
            }
          });
        }
      }
      
      if (orderSize > 50000) { // 50KB
        largeDesignCount++;
      }
    }
    
    console.log('\nOrders with base64 data:', base64Count);
    console.log('Large orders (>50KB):', largeDesignCount);
    console.log('Average order size:', Math.round(totalSize / orders.length / 1024) + 'KB');
    
    // Check designs collection
    const designs = await Design.find({}).limit(10).lean();
    console.log('\n=== DESIGN ANALYSIS ===');
    console.log('Total designs:', await Design.countDocuments());
    
    let designBase64Count = 0;
    for (const design of designs) {
      const designSize = JSON.stringify(design).length;
      const designStr = JSON.stringify(design);
      
      if (designStr.includes('data:image')) {
        designBase64Count++;
        console.log('Design with base64 data:', {
          id: design._id,
          size: Math.round(designSize / 1024) + 'KB',
          designArrayLength: design.design?.length || 0
        });
      }
    }
    
    console.log('Designs with base64 data:', designBase64Count);
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabase();