/**
 * Test Location Pricing
 * Verifies that location pricing data is correctly set up
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Money = require('../DataBase/Models/MoneyModel');

async function testLocationPricing() {
  try {
    console.log('🧪 Testing location pricing data...\n');

    // Connect to MongoDB
    const mongoURI = process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/duco-ecommerce';
    console.log('🔗 Connecting to:', mongoURI.substring(0, 30) + '...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Test locations
    const testLocations = ['Asia', 'Europe', 'North America', 'Australia'];

    for (const location of testLocations) {
      const pricing = await Money.findOne({ location });
      
      if (pricing) {
        console.log(`✅ ${location}:`);
        console.log(`   Price Increase: ${pricing.price_increase}%`);
        console.log(`   Currency: ${pricing.currency.country}`);
        console.log(`   Conversion Rate: ${pricing.currency.toconvert}`);
        console.log(`   Last Updated: ${pricing.time_stamp}\n`);
      } else {
        console.log(`❌ ${location}: NOT FOUND\n`);
      }
    }

    // Test example calculation
    console.log('📊 Example Price Calculation:');
    console.log('   Base Price: ₹500 (India)\n');

    for (const location of testLocations) {
      const pricing = await Money.findOne({ location });
      if (pricing) {
        const basePrice = 500;
        const withMarkup = basePrice + (basePrice * (pricing.price_increase / 100));
        const converted = withMarkup * pricing.currency.toconvert;
        
        console.log(`   ${location}:`);
        console.log(`   - With ${pricing.price_increase}% markup: ₹${withMarkup.toFixed(2)}`);
        console.log(`   - Converted to ${pricing.currency.country}: ${pricing.currency.country === 'INR' ? '₹' : pricing.currency.country === 'USD' ? '$' : pricing.currency.country === 'EUR' ? '€' : 'A$'}${converted.toFixed(2)}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run test
if (require.main === module) {
  testLocationPricing()
    .then(() => {
      console.log('\n✅ Location pricing test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testLocationPricing };
