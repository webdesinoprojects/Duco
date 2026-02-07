// Test the orders API to see what image data is returned
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
require('dotenv').config();

async function testAPI() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('🧪 Testing orders API response...\n');

    const userId = '6973d357114bb3182b5aa5b5';

    // Simulate the API query
    const orders = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 1,
          orderId: 1,
          status: 1,
          createdAt: 1,
          totalPay: 1,
          price: 1,
          currency: 1,
          displayPrice: 1,
          orderType: 1,
          printroveOrderId: 1,
          hasLogistics: 1,
          trackingUrl: 1,
          designImages: 1,
          products: {
            $cond: {
              if: { $isArray: '$products' },
              then: {
                $map: {
                  input: { $slice: ['$products', 1] },
                  as: 'product',
                  in: {
                    _id: '$$product._id',
                    name: '$$product.name',
                    products_name: '$$product.products_name',
                    product_name: '$$product.product_name',
                    image: '$$product.image',
                    design: {
                      front: '$$product.design.front'
                    },
                    image_url: {
                      $cond: {
                        if: { $isArray: '$$product.image_url' },
                        then: [{ $arrayElemAt: ['$$product.image_url', 0] }],
                        else: '$$product.image_url'
                      }
                    }
                  }
                }
              },
              else: []
            }
          }
        }
      }
    ]).allowDiskUse(true);

    console.log(`📦 Found ${orders.length} orders\n`);

    orders.forEach((order, idx) => {
      console.log(`Order ${idx + 1}: ${order.orderId}`);
      
      // Check what image data is available
      const product = order.products?.[0];
      const hasProductImage = product?.image && typeof product.image === 'string' && product.image.startsWith('http');
      const hasDesignFront = product?.design?.front && typeof product.design.front === 'string' && product.design.front.startsWith('http');
      const hasImageUrl = product?.image_url?.[0]?.url;
      const hasOrderDesignImages = order.designImages?.front && typeof order.designImages.front === 'string' && order.designImages.front.startsWith('http');

      console.log(`  Product: ${product?.name || product?.products_name}`);
      console.log(`  Image sources available:`);
      console.log(`    - product.image: ${hasProductImage ? '✅' : '❌'}`);
      console.log(`    - product.design.front: ${hasDesignFront ? '✅' : '❌'}`);
      console.log(`    - product.image_url[0]: ${hasImageUrl ? '✅' : '❌'}`);
      console.log(`    - order.designImages.front: ${hasOrderDesignImages ? '✅' : '❌'}`);
      
      // Determine which image will be used
      let imageSource = 'NONE';
      if (hasDesignFront) imageSource = 'product.design.front';
      else if (hasOrderDesignImages) imageSource = 'order.designImages.front';
      else if (hasImageUrl) imageSource = 'product.image_url[0]';
      else if (hasProductImage) imageSource = 'product.image';
      
      console.log(`  Will display: ${imageSource}`);
      console.log('');
    });

    const ordersWithImages = orders.filter(order => {
      const product = order.products?.[0];
      return (product?.image && typeof product.image === 'string' && product.image.startsWith('http')) ||
             (product?.design?.front && typeof product.design.front === 'string' && product.design.front.startsWith('http')) ||
             (product?.image_url?.[0]?.url) ||
             (order.designImages?.front && typeof order.designImages.front === 'string' && order.designImages.front.startsWith('http'));
    });

    console.log('='.repeat(80));
    console.log(`📊 SUMMARY:`);
    console.log(`   Total orders: ${orders.length}`);
    console.log(`   Orders with images: ${ordersWithImages.length}`);
    console.log(`   Orders without images: ${orders.length - ordersWithImages.length}`);
    
    if (ordersWithImages.length === orders.length) {
      console.log('\n✅ SUCCESS! All orders have image data available');
    } else {
      console.log(`\n⚠️  ${orders.length - ordersWithImages.length} orders missing image data`);
    }
    console.log('='.repeat(80));

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAPI();
