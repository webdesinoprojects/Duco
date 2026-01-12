// Add France/EUR entry to database
const mongoose = require('mongoose');
require('dotenv').config({ path: './Duco_Backend/.env' });

const Price = require('../DataBase/Models/MoneyModel');

async function addFranceEntry() {
  try {
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) {
      console.error('❌ MongoDB URI not found in .env');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Check if France already exists
    const existing = await Price.findOne({ location: 'France' });
    if (existing) {
      console.log('⚠️ France entry already exists, updating...');
      await Price.updateOne(
        { location: 'France' },
        {
          aliases: ['FR', 'Europe'],
          price_increase: 12,
          currency: {
            country: 'EUR',
            toconvert: 0.011
          }
        }
      );
      console.log('✅ France entry updated');
    } else {
      console.log('📝 Creating France entry...');
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
      console.log('✅ France entry created');
    }
    
    // Verify it was created
    const verifyEntry = await Price.findOne({ location: 'France' });
    console.log('\n✅ Verification - France entry in database:');
    console.log(JSON.stringify(verifyEntry, null, 2));
    
    // Show all entries
    const allEntries = await Price.find();
    console.log('\n📋 All location entries:');
    allEntries.forEach(entry => {
      console.log(`  • ${entry.location}: ${entry.currency?.country} (rate: ${entry.currency?.toconvert})`);
    });
    
    console.log('\n✅ Done! France/EUR entry is now in database');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addFranceEntry();
