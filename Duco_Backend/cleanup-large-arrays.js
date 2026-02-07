// Cleanup large arrays from orders (keep only first item in image_url arrays)
const mongoose = require('mongoose');
require('dotenv').config();

const USER_ID = '6973d357114bb3182b5aa5b5';

async function cleanupOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    console.log('📊 Checking current order sizes...');
    const sizesBefore = await mongoose.connection.db.collection('orders').aggregate([
      { $match: { user: new mongoose.Types.ObjectId(USER_ID) } },
      {
        $project: {
          orderId: 1,
          bsonSize: { $bsonSize: '$$ROOT' },
          productsCount: { $size: { $ifNull: ['$products', []] } }
        }
      }
    ]).toArray();

    console.log('\n📦 Current sizes:');
    sizesBefore.forEach(order => {
      console.log(`   Order ${order.orderId}: ${(order.bsonSize / 1024 / 1024).toFixed(2)} MB (${order.productsCount} products)`);
    });

    console.log('\n🧹 Starting cleanup...');
    console.log('This will:');
    console.log('  - Keep only first item in image_url arrays');
    console.log('  - Keep Cloudinary URLs (not remove them)');
    console.log('  - Remove large nested data structures\n');

    // Update orders to keep only first image_url item
    const result = await mongoose.connection.db.collection('orders').updateMany(
      { user: new mongoose.Types.ObjectId(USER_ID) },
      [
        {
          $set: {
            products: {
              $map: {
                input: '$products',
                as: 'product',
                in: {
                  _id: '$$product._id',
                  name: '$$product.name',
                  products_name: '$$product.products_name',
                  product_name: '$$product.product_name',
                  image: '$$product.image',
                  price: '$$product.price',
                  quantity: '$$product.quantity',
                  size: '$$product.size',
                  color: '$$product.color',
                  // Keep design and previewImages (they should have Cloudinary URLs now)
                  design: '$$product.design',
                  previewImages: '$$product.previewImages',
                  // Keep ONLY first image_url if it exists
                  image_url: {
                    $cond: {
                      if: { $and: [
                        { $isArray: '$$product.image_url' },
                        { $gt: [{ $size: '$$product.image_url' }, 0] }
                      ]},
                      then: [{ $arrayElemAt: ['$$product.image_url', 0] }],
                      else: '$$product.image_url'
                    }
                  }
                }
              }
            }
          }
        }
      ]
    );

    console.log(`✅ Updated ${result.modifiedCount} orders\n`);

    console.log('📊 Checking new order sizes...');
    const sizesAfter = await mongoose.connection.db.collection('orders').aggregate([
      { $match: { user: new mongoose.Types.ObjectId(USER_ID) } },
      {
        $project: {
          orderId: 1,
          bsonSize: { $bsonSize: '$$ROOT' },
          productsCount: { $size: { $ifNull: ['$products', []] } }
        }
      }
    ]).toArray();

    console.log('\n📦 New sizes:');
    let totalSavedBytes = 0;
    sizesAfter.forEach((orderAfter, idx) => {
      const orderBefore = sizesBefore.find(o => o.orderId === orderAfter.orderId);
      const saved = orderBefore ? orderBefore.bsonSize - orderAfter.bsonSize : 0;
      totalSavedBytes += saved;
      
      console.log(`   Order ${orderAfter.orderId}: ${(orderAfter.bsonSize / 1024 / 1024).toFixed(2)} MB (saved ${(saved / 1024 / 1024).toFixed(2)} MB)`);
    });

    console.log(`\n💾 Total saved: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);

    await mongoose.disconnect();
    console.log('\n✅ Cleanup complete!');
    console.log('🔄 Now restart your backend and test the /order page');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupOrders();
