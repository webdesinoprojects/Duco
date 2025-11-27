/**
 * Migration Script: Update Order Currencies Based on Address Country
 * 
 * This script updates existing orders to set the correct currency
 * based on their billing address country.
 * 
 * Run with: node scripts/update-order-currencies.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../DataBase/Models/OrderModel');

// Currency mapping (same as in completeOrderController.js)
function getCurrencyFromCountry(country) {
  if (!country) return 'INR';
  
  const countryLower = country.toLowerCase().trim();
  
  const countryCurrencyMap = {
    'india': 'INR',
    'united states': 'USD',
    'usa': 'USD',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'europe': 'EUR',
    'germany': 'EUR',
    'france': 'EUR',
    'spain': 'EUR',
    'italy': 'EUR',
    'netherlands': 'EUR',
    'belgium': 'EUR',
    'austria': 'EUR',
    'portugal': 'EUR',
    'greece': 'EUR',
    'ireland': 'EUR',
    'uae': 'AED',
    'dubai': 'AED',
    'united arab emirates': 'AED',
    'australia': 'AUD',
    'canada': 'CAD',
    'singapore': 'SGD',
    'new zealand': 'NZD',
    'switzerland': 'CHF',
    'japan': 'JPY',
    'china': 'CNY',
    'hong kong': 'HKD',
    'malaysia': 'MYR',
    'thailand': 'THB',
    'saudi arabia': 'SAR',
    'qatar': 'QAR',
    'kuwait': 'KWD',
    'bahrain': 'BHD',
    'oman': 'OMR',
    'south africa': 'ZAR',
    'pakistan': 'PKR',
    'sri lanka': 'LKR',
    'bangladesh': 'BDT',
    'nepal': 'NPR',
    'philippines': 'PHP',
    'indonesia': 'IDR',
    'south korea': 'KRW',
    'korea': 'KRW',
  };
  
  return countryCurrencyMap[countryLower] || 'INR';
}

async function updateOrderCurrencies() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find all orders
    console.log('\n📦 Fetching all orders...');
    const orders = await Order.find({}).lean();
    console.log(`Found ${orders.length} orders`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    console.log('\n🔄 Processing orders...\n');

    for (const order of orders) {
      try {
        // Get country from billing address
        const billingCountry = order.addresses?.billing?.country || order.address?.country || 'India';
        
        // Detect currency
        const detectedCurrency = getCurrencyFromCountry(billingCountry);
        
        // Get conversion rate (if stored) or default to 1
        const conversionRate = order.conversionRate || 1;
        
        // Calculate display price (price in customer's currency)
        // If conversionRate exists and is not 1, the price is in INR and needs to be converted
        const displayPrice = conversionRate !== 1 
          ? order.price * conversionRate 
          : order.price;
        
        // Check if currency needs update
        const needsUpdate = 
          order.currency !== detectedCurrency || 
          !order.displayPrice ||
          !order.conversionRate;
        
        if (needsUpdate) {
          // Update the order
          await Order.updateOne(
            { _id: order._id },
            { 
              $set: { 
                currency: detectedCurrency,
                displayPrice: displayPrice,
                conversionRate: conversionRate || 1
              } 
            }
          );
          
          console.log(`✅ Updated Order ${order._id}`);
          console.log(`   Country: ${billingCountry}`);
          console.log(`   Currency: ${order.currency || 'INR'} → ${detectedCurrency}`);
          console.log(`   Price (INR): ₹${order.price}`);
          console.log(`   Display Price: ${detectedCurrency} ${displayPrice.toFixed(2)}`);
          console.log(`   Conversion Rate: ${conversionRate}\n`);
          
          updatedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating order ${order._id}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Orders: ${orders.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already correct): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');

    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    console.log('\n✨ Migration completed successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
updateOrderCurrencies();
