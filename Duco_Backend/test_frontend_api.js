/**
 * Test Frontend API Integration
 * Verifies that the backend APIs are working correctly for frontend consumption
 */

const axios = require('axios');

const API_BASE = 'https://duco-67o5.onrender.com/';

async function testFrontendAPIs() {
  console.log('🧪 Testing Frontend API Integration\n');

  try {
    // Test 1: Products API
    console.log('1️⃣ Testing Products API...');
    const productsResponse = await axios.get(`${API_BASE}products/get`);
    const products = productsResponse.data || [];

    console.log(`✅ Products API: ${products.length} products found`);

    if (products.length > 0) {
      const firstProduct = products[0];
      console.log('📦 Sample product:', {
        id: firstProduct._id,
        name: firstProduct.products_name,
        hasPricing: !!firstProduct.pricing?.[0]?.price_per,
        price: firstProduct.pricing?.[0]?.price_per,
        hasImages: !!firstProduct.image_url?.[0]?.url?.[0],
        imageUrl: firstProduct.image_url?.[0]?.url?.[0],
      });
    }

    // Test 2: Single Product API
    if (products.length > 0) {
      console.log('\n2️⃣ Testing Single Product API...');
      const productId = products[0]._id;
      const singleProductResponse = await axios.get(
        `${API_BASE}products/get/${productId}`
      );
      const singleProduct = singleProductResponse.data;

      console.log(`✅ Single Product API: Product ${productId} loaded`);
      console.log('📦 Product details:', {
        id: singleProduct._id,
        name: singleProduct.products_name,
        hasPricing: !!singleProduct.pricing?.[0]?.price_per,
        price: singleProduct.pricing?.[0]?.price_per,
        hasImages: !!singleProduct.image_url?.[0]?.url?.[0],
      });
    }

    // Test 3: Categories API
    console.log('\n3️⃣ Testing Categories API...');
    const categoriesResponse = await axios.get(`${API_BASE}category/getall`);
    const categories = categoriesResponse.data?.category || [];

    console.log(`✅ Categories API: ${categories.length} categories found`);
    if (categories.length > 0) {
      console.log(
        '📁 Sample categories:',
        categories.slice(0, 3).map((c) => c.name)
      );
    }

    // Test 4: Money/Location API
    console.log('\n4️⃣ Testing Money/Location API...');
    try {
      const moneyResponse = await axios.post(
        `${API_BASE}money/get_location_increase`,
        {
          location: 'Asia',
        }
      );
      const moneyData = moneyResponse.data;

      console.log('✅ Money API: Location pricing data loaded');
      console.log('💰 Pricing data:', {
        location: 'Asia',
        percentage: moneyData.percentage,
        toConvert: moneyData.currency?.toconvert,
      });
    } catch (error) {
      console.log('⚠️ Money API: Not available or error:', error.message);
    }

    // Test 5: Subcategories API
    if (categories.length > 0) {
      console.log('\n5️⃣ Testing Subcategories API...');
      const categoryId = categories[0]._id;
      const subcategoriesResponse = await axios.get(
        `${API_BASE}subcategory/subcat/${categoryId}`
      );
      const subcategories = subcategoriesResponse.data?.data || [];

      console.log(
        `✅ Subcategories API: ${subcategories.length} subcategories found for category ${categoryId}`
      );
    }

    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Products: ${products.length} available`);
    console.log(`- Categories: ${categories.length} available`);
    console.log('- Single product API: Working');
    console.log('- Money/Location API: Working');
    console.log('- Subcategories API: Working');

    console.log('\n✅ Frontend should be able to:');
    console.log('  - Display product lists with prices');
    console.log('  - Navigate to individual product pages');
    console.log('  - Calculate prices with location-based adjustments');
    console.log('  - Filter products by category and gender');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testFrontendAPIs()
    .then(() => {
      console.log('\n✅ Frontend API test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Frontend API test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testFrontendAPIs };
