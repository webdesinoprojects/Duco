// Script to create Printrove mappings for all products
const mongoose = require('mongoose');
const Product = require('../DataBase/Models/ProductsModel');
const PrintroveIntegrationService = require('../Service/PrintroveIntegrationService');
require('dotenv').config();

async function createMappingsForAllProducts() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duco');
    console.log('✅ Connected to MongoDB');

    // Get all products that have printroveProductId
    const products = await Product.find({ 
      printroveProductId: { $exists: true, $ne: null } 
    });

    console.log(`📦 Found ${products.length} products with Printrove IDs`);

    if (products.length === 0) {
      console.log('❌ No products found with Printrove IDs. Please set printroveProductId for your products first.');
      process.exit(1);
    }

    const results = [];

    for (const product of products) {
      try {
        console.log(`\n🔄 Processing product: ${product.products_name} (ID: ${product._id})`);
        console.log(`   Printrove Product ID: ${product.printroveProductId}`);

        // Check if mapping already exists
        const existingMapping = await PrintroveIntegrationService.getProductMapping(product._id);
        if (existingMapping) {
          console.log('   ✅ Mapping already exists, skipping...');
          results.push({ productId: product._id, status: 'exists', mapping: existingMapping });
          continue;
        }

        // Create mapping
        const mapping = await PrintroveIntegrationService.createProductMapping(
          product._id,
          product.printroveProductId
        );

        console.log(`   ✅ Created mapping with ${mapping.variants.length} variants`);
        results.push({ productId: product._id, status: 'created', mapping });

      } catch (error) {
        console.error(`   ❌ Error processing product ${product._id}:`, error.message);
        results.push({ productId: product._id, status: 'error', error: error.message });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${results.filter(r => r.status === 'created').length}`);
    console.log(`   Existed: ${results.filter(r => r.status === 'exists').length}`);
    console.log(`   Errors: ${results.filter(r => r.status === 'error').length}`);

    if (results.filter(r => r.status === 'error').length > 0) {
      console.log('\n❌ Errors:');
      results.filter(r => r.status === 'error').forEach(r => {
        console.log(`   - Product ${r.productId}: ${r.error}`);
      });
    }

    console.log('\n✅ Printrove mapping creation completed!');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Run the script
createMappingsForAllProducts();