#!/usr/bin/env node
/**
 * Setup script to add France/EUR entry to MongoDB
 * Run: node Duco_Backend/scripts/setup-france-euro.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './Duco_Backend/.env' });

const Price = require('../DataBase/Models/MoneyModel');

async function setupFranceEntry() {
  try {
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in Duco_Backend/.env');
      console.error('   Make sure DB_URL is set in your .env file');
      process.exit(1);
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Check if France already exists
    const existing = await Price.findOne({ location: 'France' });
    
    if (existing) {
      console.log('⚠️  France entry already exists');
      console.log('📝 Updating with correct values...\n');
      
      await Price.updateOne(
        { location: 'France' },
        {
          $set: {
            aliases: ['FR', 'Europe'],
            price_increase: 12,
            currency: {
              country: 'EUR',
              toconvert: 0.011
            }
          }
        }
      );
      console.log('✅ France entry updated\n');
    } else {
      console.log('📝 Creating France entry...\n');
      
      const newEntry = new Price({
        location: 'France',
        aliases: ['FR', 'Europe'],
        price_increase: 12,
        currency: {
          country: 'EUR',
          toconvert: 0.011
        }
      });
      
      await newEntry.save();
      console.log('✅ France entry created\n');
    }
    
    // Verify the entry
    const verifyEntry = await Price.findOne({ location: 'France' });
    console.log('📋 Verification - France entry in database:');
    console.log('   Location: ' + verifyEntry.location);
    console.log('   Currency: ' + verifyEntry.currency.country);
    console.log('   Conversion Rate: ' + verifyEntry.currency.toconvert);
    console.log('   Price Increase: ' + verifyEntry.price_increase + '%');
    console.log('   Aliases: ' + verifyEntry.aliases.join(', ') + '\n');
    
    // Show all entries
    const allEntries = await Price.find().sort({ location: 1 });
    console.log('📊 All location entries in database:');
    allEntries.forEach(entry => {
      console.log(`   • ${entry.location}: ${entry.currency.country} (rate: ${entry.currency.toconvert}, markup: ${entry.price_increase}%)`);
    });
    
    console.log('\n✅ SUCCESS! France/EUR entry is ready');
    console.log('   Now restart your frontend and refresh the page');
    console.log('   Prices should display in EUR (€)\n');
    
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

setupFranceEntry();
