// Setup script to create sample Printrove mappings
const mongoose = require('mongoose');
const PrintroveMapping = require('./Duco_Backend/DataBase/Models/PrintroveMappingModel');
const Product = require('./Duco_Backend/DataBase/Models/ProductsModel');

async function setupPrintroveMappings() {
  try {
    console.log('🔧 Setting up Printrove mappings...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duco', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    // Sample Printrove mappings (you'll need to replace these with actual Printrove IDs)
    const sampleMappings = [
      {
        printroveProductId: 1000, // Replace with actual Printrove product ID
        printroveProductName: 'Basic T-Shirt',
        variants: [
          { ducoSize: 'S', printroveVariantId: 22094474, printrovePrice: 299 },
          { ducoSize: 'M', printroveVariantId: 22094475, printrovePrice: 299 },
          { ducoSize: 'L', printroveVariantId: 22094476, printrovePrice: 299 },
          { ducoSize: 'XL', printroveVariantId: 22094477, printrovePrice: 299 },
          { ducoSize: '2XL', printroveVariantId: 22094478, printrovePrice: 349 },
          { ducoSize: '3XL', printroveVariantId: 22094479, printrovePrice: 349 },
        ]
      },
      {
        printroveProductId: 1001, // Replace with actual Printrove product ID
        printroveProductName: 'Premium T-Shirt',
        variants: [
          { ducoSize: 'S', printroveVariantId: 22094480, printrovePrice: 399 },
          { ducoSize: 'M', printroveVariantId: 22094481, printrovePrice: 399 },
          { ducoSize: 'L', printroveVariantId: 22094482, printrovePrice: 399 },
          { ducoSize: 'XL', printroveVariantId: 22094483, printrovePrice: 399 },
          { ducoSize: '2XL', printroveVariantId: 22094484, printrovePrice: 449 },
          { ducoSize: '3XL', printroveVariantId: 22094485, printrovePrice: 449 },
        ]
      }
    ];

    // Create mappings for products
    let mappingIndex = 0;
    for (const product of products.slice(0, 2)) { // Only map first 2 products as example
      const mappingData = sampleMappings[mappingIndex];
      
      try {
        // Check if mapping already exists
        const existingMapping = await PrintroveMapping.findOne({ ducoProductId: product._id });
        if (existingMapping) {
          console.log(`⚠️ Mapping already exists for product: ${product.products_name}`);
          continue;
        }

        // Create new mapping
        const mapping = new PrintroveMapping({
          ducoProductId: product._id,
          printroveProductId: mappingData.printroveProductId,
          printroveProductName: mappingData.printroveProductName,
          variants: mappingData.variants.map(v => ({
            ducoSize: v.ducoSize,
            ducoColor: 'Default',
            printroveVariantId: v.printroveVariantId,
            printroveVariantName: `${v.ducoSize} - Default`,
            printrovePrice: v.printrovePrice,
            isAvailable: true
          })),
          syncStatus: 'active',
          isActive: true
        });

        await mapping.save();

        // Update product with Printrove info
        await Product.findByIdAndUpdate(product._id, {
          printroveProductId: mappingData.printroveProductId,
          printroveVariantId: mappingData.variants[0].printroveVariantId
        });

        console.log(`✅ Created mapping for product: ${product.products_name}`);
        mappingIndex++;
      } catch (error) {
        console.error(`❌ Error creating mapping for ${product.products_name}:`, error.message);
      }
    }

    console.log('🎉 Printrove mappings setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Replace sample Printrove IDs with actual IDs from your Printrove account');
    console.log('2. Run the Printrove sync API to update mappings');
    console.log('3. Test the T-shirt designer with mapped products');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run setup
if (require.main === module) {
  setupPrintroveMappings();
}

module.exports = { setupPrintroveMappings };