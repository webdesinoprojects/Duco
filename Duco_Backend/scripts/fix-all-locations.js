#!/usr/bin/env node
/**
 * Fix script to clean up and standardize all location entries
 * Run: node Duco_Backend/scripts/fix-all-locations.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './Duco_Backend/.env' });

const Price = require('../DataBase/Models/MoneyModel');

// Standard locations with correct data
const STANDARD_LOCATIONS = [
  {
    location: 'India',
    aliases: ['IN', 'IND'],
    price_increase: 0,
    currency: { country: 'INR', toconvert: 1 }
  },
  {
    location: 'United States',
    aliases: ['US', 'USA'],
    price_increase: 15,
    currency: { country: 'USD', toconvert: 0.012 }
  },
  {
    location: 'Canada',
    aliases: ['CA', 'CAN'],
    price_increase: 15,
    currency: { country: 'CAD', toconvert: 0.0088 }
  },
  {
    location: 'United Kingdom',
    aliases: ['GB', 'UK'],
    price_increase: 12,
    currency: { country: 'GBP', toconvert: 0.0095 }
  },
  {
    location: 'Germany',
    aliases: ['DE', 'DEU'],
    price_increase: 12,
    currency: { country: 'EUR', toconvert: 0.011 }
  },
  {
    location: 'France',
    aliases: ['FR', 'FRA'],
    price_increase: 12,
    currency: { country: 'EUR', toconvert: 0.011 }
  },
  {
    location: 'Netherlands',
    aliases: ['NL', 'NLD'],
    price_increase: 12,
    currency: { country: 'EUR', toconvert: 0.011 }
  },
  {
    location: 'Spain',
    aliases: ['ES', 'ESP'],
    price_increase: 12,
    currency: { country: 'EUR', toconvert: 0.011 }
  },
  {
    location: 'Italy',
    aliases: ['IT', 'ITA'],
    price_increase: 12,
    currency: { country: 'EUR', toconvert: 0.011 }
  },
  {
    location: 'Australia',
    aliases: ['AU', 'AUS'],
    price_increase: 20,
    currency: { country: 'AUD', toconvert: 0.0078 }
  },
  {
    location: 'New Zealand',
    aliases: ['NZ', 'NZL'],
    price_increase: 20,
    currency: { country: 'NZD', toconvert: 0.0072 }
  },
  {
    location: 'China',
    aliases: ['CN', 'CHN'],
    price_increase: 25,
    currency: { country: 'CNY', toconvert: 0.087 }
  },
  {
    location: 'Japan',
    aliases: ['JP', 'JPN'],
    price_increase: 20,
    currency: { country: 'JPY', toconvert: 1.8 }
  },
  {
    location: 'South Korea',
    aliases: ['KR', 'KOR'],
    price_increase: 20,
    currency: { country: 'KRW', toconvert: 15.5 }
  },
  {
    location: 'Singapore',
    aliases: ['SG', 'SGP'],
    price_increase: 15,
    currency: { country: 'SGD', toconvert: 0.0088 }
  },
  {
    location: 'UAE',
    aliases: ['AE', 'ARE'],
    price_increase: 15,
    currency: { country: 'AED', toconvert: 0.044 }
  },
  {
    location: 'Saudi Arabia',
    aliases: ['SA', 'SAU'],
    price_increase: 15,
    currency: { country: 'SAR', toconvert: 0.045 }
  },
  {
    location: 'Malaysia',
    aliases: ['MY', 'MYS'],
    price_increase: 50,
    currency: { country: 'MYR', toconvert: 0.055 }
  }
];

async function fixAllLocations() {
  try {
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in Duco_Backend/.env');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Delete all existing entries
    console.log('🗑️  Deleting all existing location entries...');
    const deleteResult = await Price.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} entries\n`);
    
    // Step 2: Insert standard locations
    console.log('📝 Creating standard location entries...');
    const insertResult = await Price.insertMany(STANDARD_LOCATIONS);
    console.log(`✅ Created ${insertResult.length} entries\n`);
    
    // Step 3: Verify all entries
    const allEntries = await Price.find().sort({ location: 1 });
    console.log('📊 All location entries in database:');
    console.log('═'.repeat(80));
    allEntries.forEach(entry => {
      console.log(`📍 ${entry.location}`);
      console.log(`   Currency: ${entry.currency.country}`);
      console.log(`   Conversion Rate: ${entry.currency.toconvert}`);
      console.log(`   Price Markup: ${entry.price_increase}%`);
      console.log(`   Aliases: ${entry.aliases.join(', ')}`);
      console.log('');
    });
    console.log('═'.repeat(80));
    
    console.log('\n✅ SUCCESS! All locations have been fixed');
    console.log('   • India: INR (1:1 conversion, 0% markup)');
    console.log('   • France: EUR (0.011 conversion, 12% markup)');
    console.log('   • Netherlands: EUR (0.011 conversion, 12% markup)');
    console.log('   • Malaysia: MYR (0.055 conversion, 50% markup)');
    console.log('   • And 14 more countries...\n');
    console.log('📌 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Restart your frontend');
    console.log('   3. Clear browser cache');
    console.log('   4. Test with different locations\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check MongoDB is running');
    console.error('2. Verify DB_URL in Duco_Backend/.env');
    console.error('3. Check internet connection for MongoDB Atlas');
    process.exit(1);
  }
}

fixAllLocations();
