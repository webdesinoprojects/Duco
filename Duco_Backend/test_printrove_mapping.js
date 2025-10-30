// Test script to check Printrove mappings
const mongoose = require('mongoose');
const PrintroveIntegrationService = require('./Service/PrintroveIntegrationService');
require('dotenv').config();

async function testPrintroveMapping() {
  try {
    // Connect to database
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to database');

    const productId = '689c982422ace96fe49e47f7'; // The problematic product
    
    console.log(`🔍 Testing Printrove mapping for product: ${productId}`);
    
    // Get current mapping
    const mapping = await PrintroveIntegrationService.getProductMapping(productId);
    
    if (!mapping) {
      console.log('❌ No mapping found for this product');
      
      // Try to create a mapping
      console.log('🔄 Attempting to create mapping...');
      try {
        const newMapping = await PrintroveIntegrationService.createProductMapping(productId, null);
        console.log('✅ Created new mapping:', newMapping);
      } catch (error) {
        console.error('❌ Failed to create mapping:', error.message);
      }
    } else {
      console.log('✅ Found existing mapping:');
      console.log('📦 Printrove Product ID:', mapping.printroveProductId);
      console.log('🔢 Available variants:');
      
      mapping.variants.forEach((variant, index) => {
        console.log(`  ${index + 1}. Size: ${variant.ducoSize}, Variant ID: ${variant.printroveVariantId}, Available: ${variant.isAvailable}`);
      });
      
      // Test variant ID resolution for common sizes
      const testSizes = ['S', 'M', 'L', 'XL'];
      console.log('\n🧪 Testing variant ID resolution:');
      
      for (const size of testSizes) {
        const variantId = await PrintroveIntegrationService.getVariantId(productId, size);
        console.log(`  Size ${size}: ${variantId || 'NOT FOUND'}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

testPrintroveMapping();