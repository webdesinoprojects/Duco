// ============================================================================
// MONGODB SCRIPT TO CLEAN LARGE ORDERS
// ============================================================================
// Run this in MongoDB Compass or MongoDB Shell to clean existing orders
// This will remove large fields and keep only essential data
// ============================================================================

// USER ID with slow orders
const userId = ObjectId('6973d357114bb3182b5aa5b5');

// Step 1: Check current order sizes
print('📊 Checking current order sizes...\n');
db.orders.aggregate([
  { $match: { user: userId } },
  {
    $project: {
      orderId: 1,
      bsonSize: { $bsonSize: '$$ROOT' },
      productsCount: { $size: { $ifNull: ['$products', []] } }
    }
  }
]).forEach(order => {
  print(`Order ${order.orderId}: ${(order.bsonSize / 1024 / 1024).toFixed(2)} MB (${order.productsCount} products)`);
});

print('\n🧹 Starting cleanup...\n');

// Step 2: Clean the orders
const result = db.orders.updateMany(
  { user: userId },
  [
    {
      $set: {
        // Clean products array - keep only essential fields
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
              // Removed: design, previewImages, and other large fields
            }
          }
        }
      }
    }
  ]
);

print(`✅ Updated ${result.modifiedCount} orders\n`);

// Step 3: Remove any remaining large fields
const unsetResult = db.orders.updateMany(
  { user: userId },
  {
    $unset: {
      'products.design': '',
      'products.previewImages': '',
      'previewImages': '',
      'designImages': ''
    }
  }
);

print(`✅ Removed large fields from ${unsetResult.modifiedCount} orders\n`);

// Step 4: Check new sizes
print('📊 Checking new order sizes...\n');
db.orders.aggregate([
  { $match: { user: userId } },
  {
    $project: {
      orderId: 1,
      bsonSize: { $bsonSize: '$$ROOT' },
      productsCount: { $size: { $ifNull: ['$products', []] } }
    }
  }
]).forEach(order => {
  print(`Order ${order.orderId}: ${(order.bsonSize / 1024 / 1024).toFixed(2)} MB (${order.productsCount} products)`);
});

print('\n✅ Cleanup complete!');
print('🔄 Now restart your backend and test the /order page');
