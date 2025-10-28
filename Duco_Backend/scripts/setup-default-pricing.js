/**
 * Setup Default Pricing Data
 * Creates default pricing configuration for all locations
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import the Money model
const Money = require('../DataBase/Models/MoneyModel');

async function setupDefaultPricing() {
  try {
    console.log('🚀 Setting up default pricing data...');

    // Connect to MongoDB
    const mongoURI =
      process.env.DB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/duco-ecommerce';
    console.log('🔗 Connecting to:', mongoURI.substring(0, 30) + '...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Default pricing data for different locations
    // Updated with current exchange rates (as of 2025)
    const defaultPricingData = [
      {
        location: 'Asia',
        price_increase: 0, // No markup for Asia (home region)
        currency: {
          country: 'INR', // Indian Rupee
          toconvert: 1, // 1:1 conversion (base currency)
        },
      },
      {
        location: 'North America',
        price_increase: 20, // 20% markup for North America
        currency: {
          country: 'USD', // US Dollar
          toconvert: 0.012, // 1 INR ≈ 0.012 USD
        },
      },
      {
        location: 'Europe',
        price_increase: 15, // 15% markup for Europe
        currency: {
          country: 'EUR', // Euro
          toconvert: 0.011, // 1 INR ≈ 0.011 EUR
        },
      },
      {
        location: 'Australia',
        price_increase: 18, // 18% markup for Australia
        currency: {
          country: 'AUD', // Australian Dollar
          toconvert: 0.018, // 1 INR ≈ 0.018 AUD
        },
      },
    ];

    // Clear existing pricing data
    await Money.deleteMany({});
    console.log('🗑️ Cleared existing pricing data');

    // Insert default pricing data
    for (const pricingData of defaultPricingData) {
      const money = new Money(pricingData);
      await money.save();
      console.log(
        `✅ Created pricing for ${pricingData.location}: ${pricingData.price_increase}% markup, ${pricingData.currency.toconvert} conversion rate`
      );
    }

    console.log('\n🎉 Default pricing data setup completed!');
    console.log('\n📋 Summary:');
    console.log('- Asia (INR): 0% markup, 1:1 conversion');
    console.log('- North America (USD): 20% markup, 0.012 conversion');
    console.log('- Europe (EUR): 15% markup, 0.011 conversion');
    console.log('- Australia (AUD): 18% markup, 0.018 conversion');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDefaultPricing()
    .then(() => {
      console.log('✅ Default pricing setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Default pricing setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupDefaultPricing };
