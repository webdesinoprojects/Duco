// Setup default location entries for price calculation
// Run this once to initialize the database with default locations

const mongoose = require('mongoose');
require('dotenv').config();

const Price = require('../DataBase/Models/MoneyModel');

const DEFAULT_LOCATIONS = [
  {
    location: 'India',
    aliases: ['IN', 'Bharat', 'Asia'],
    price_increase: 0,
    currency: {
      country: 'INR',
      toconvert: 1
    }
  },
  {
    location: 'United States',
    aliases: ['US', 'USA', 'America'],
    price_increase: 20,
    currency: {
      country: 'USD',
      toconvert: 0.012
    }
  },
  {
    location: 'United Kingdom',
    aliases: ['UK', 'GB', 'England'],
    price_increase: 15,
    currency: {
      country: 'GBP',
      toconvert: 0.0095
    }
  },
  {
    location: 'Canada',
    aliases: ['CA'],
    price_increase: 18,
    currency: {
      country: 'CAD',
      toconvert: 0.016
    }
  },
  {
    location: 'Australia',
    aliases: ['AU'],
    price_increase: 25,
    currency: {
      country: 'AUD',
      toconvert: 0.018
    }
  },
  {
    location: 'Germany',
    aliases: ['DE'],
    price_increase: 12,
    currency: {
      country: 'EUR',
      toconvert: 0.011
    }
  },
  {
    location: 'France',
    aliases: ['FR'],
    price_increase: 12,
    currency: {
      country: 'EUR',
      toconvert: 0.011
    }
  },
  {
    location: 'Japan',
    aliases: ['JP'],
    price_increase: 30,
    currency: {
      country: 'JPY',
      toconvert: 1.5
    }
  },
  {
    location: 'Singapore',
    aliases: ['SG'],
    price_increase: 22,
    currency: {
      country: 'SGD',
      toconvert: 0.016
    }
  },
  {
    location: 'UAE',
    aliases: ['AE', 'Dubai'],
    price_increase: 15,
    currency: {
      country: 'AED',
      toconvert: 0.044
    }
  }
];

async function setupLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/duco');
    console.log('✅ Connected to MongoDB');

    // Clear existing entries (optional - comment out to preserve existing data)
    // await Price.deleteMany({});
    // console.log('🗑️ Cleared existing price entries');

    let created = 0;
    let updated = 0;

    for (const locationData of DEFAULT_LOCATIONS) {
      const existing = await Price.findOne({ location: locationData.location });

      if (existing) {
        // Update existing entry
        await Price.updateOne(
          { location: locationData.location },
          {
            aliases: locationData.aliases,
            price_increase: locationData.price_increase,
            currency: locationData.currency
          }
        );
        updated++;
        console.log(`✏️ Updated: ${locationData.location}`);
      } else {
        // Create new entry
        const newPrice = new Price(locationData);
        await newPrice.save();
        created++;
        console.log(`✅ Created: ${locationData.location}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Total: ${created + updated}`);

    // Verify all entries
    const allEntries = await Price.find();
    console.log(`\n📋 All location entries in database:`);
    allEntries.forEach(entry => {
      console.log(`   • ${entry.location} (${entry.currency.country}) - ${entry.price_increase}% markup`);
    });

    console.log('\n✅ Setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

setupLocations();
