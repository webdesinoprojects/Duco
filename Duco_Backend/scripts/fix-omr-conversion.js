// Fix OMR conversion rate
// Current: 1 INR = 238 OMR (WRONG - backwards)
// Correct: 238 INR = 1 OMR, so 1 INR = 1/238 = 0.00420 OMR

const mongoose = require('mongoose');
const Price = require('../DataBase/Models/MoneyModel');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixOMRConversion = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) {
      throw new Error('DB_URL not found in .env file');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find Oman entry (case-insensitive)
    const omanEntry = await Price.findOne({ 
      location: { $regex: /^oman$/i } 
    });
    
    if (!omanEntry) {
      console.log('❌ Oman entry not found in database');
      console.log('📍 Available locations:');
      const allEntries = await Price.find({}, 'location currency.country currency.toconvert');
      allEntries.forEach(entry => {
        console.log(`   • ${entry.location}: ${entry.currency.country} (rate: ${entry.currency.toconvert})`);
      });
      process.exit(1);
    }

    console.log('\n📍 Found Oman entry:');
    console.log(`   Location: ${omanEntry.location}`);
    console.log(`   Currency: ${omanEntry.currency.country}`);
    console.log(`   Current conversion rate: 1 INR = ${omanEntry.currency.toconvert} OMR`);
    console.log(`   ❌ This is WRONG - it should be: 238 INR = 1 OMR`);
    console.log(`   ✅ Which means: 1 INR = ${(1/238).toFixed(5)} OMR`);

    // Fix the conversion rate
    const correctRate = 1 / 238; // 0.00420168...
    omanEntry.currency.toconvert = correctRate;
    await omanEntry.save();

    console.log('\n✅ Fixed Oman conversion rate:');
    console.log(`   New conversion rate: 1 INR = ${omanEntry.currency.toconvert.toFixed(5)} OMR`);
    console.log(`   Or equivalently: 238 INR = 1 OMR`);

    // Verify the fix
    const updated = await Price.findOne({ 
      location: { $regex: /^oman$/i } 
    });
    
    if (updated) {
      console.log('\n✅ Verification:');
      console.log(`   Stored value: ${updated.currency.toconvert}`);
      console.log(`   Display: 1 INR = ${updated.currency.toconvert} OMR`);
      console.log(`   Price calculation example: 500 INR × ${updated.currency.toconvert} = ${(500 * updated.currency.toconvert).toFixed(2)} OMR`);
    }

    console.log('\n✅ OMR conversion rate fixed successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixOMRConversion();
