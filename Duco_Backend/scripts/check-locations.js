// Check what locations are in the database
const mongoose = require('mongoose');
require('dotenv').config();

const Price = require('../DataBase/Models/MoneyModel');

async function checkLocations() {
  try {
    const mongoUri = process.env.DB_URL || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in .env');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find all entries
    const allEntries = await Price.find();
    console.log('\n📋 All location entries in database:');
    console.log(`Total: ${allEntries.length}\n`);
    
    allEntries.forEach(entry => {
      console.log(`  Location: ${entry.location}`);
      console.log(`    Currency: ${entry.currency?.country}`);
      console.log(`    Conversion Rate: ${entry.currency?.toconvert}`);
      console.log(`    Price Increase: ${entry.price_increase}%`);
      console.log(`    Aliases: ${entry.aliases?.join(', ') || 'None'}`);
      console.log('');
    });
    
    // Check for EUR specifically
    const eurEntry = await Price.findOne({ 
      $or: [
        { location: /France/i },
        { location: /EUR/i },
        { 'currency.country': 'EUR' }
      ]
    });
    
    if (eurEntry) {
      console.log('✅ EUR Entry Found:');
      console.log(JSON.stringify(eurEntry, null, 2));
    } else {
      console.log('❌ No EUR entry found in database');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkLocations();
