// Quick verification: Check if any base64 images remain
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

async function verify() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Check orders
    console.log('🔍 Checking ORDERS collection...');
    const ordersWithBase64 = await db.collection('orders').countDocuments({
      $or: [
        { 'designImages.front': { $regex: '^data:image/' } },
        { 'designImages.back': { $regex: '^data:image/' } },
        { 'designImages.left': { $regex: '^data:image/' } },
        { 'designImages.right': { $regex: '^data:image/' } },
        { 'products.design.front': { $regex: '^data:image/' } },
        { 'products.design.back': { $regex: '^data:image/' } },
        { 'products.design.left': { $regex: '^data:image/' } },
        { 'products.design.right': { $regex: '^data:image/' } }
      ]
    });

    if (ordersWithBase64 === 0) {
      console.log('   ✅ NO BASE64 IMAGES in orders\n');
    } else {
      console.log(`   ⚠️  FOUND ${ordersWithBase64} orders with base64 images\n`);
    }

    // Check invoices
    console.log('🔍 Checking INVOICES collection...');
    const invoicesWithBase64 = await db.collection('invoices').countDocuments({
      $or: [
        { 'designImages.front': { $regex: '^data:image/' } },
        { 'designImages.back': { $regex: '^data:image/' } },
        { 'designImages.left': { $regex: '^data:image/' } },
        { 'designImages.right': { $regex: '^data:image/' } }
      ]
    });

    if (invoicesWithBase64 === 0) {
      console.log('   ✅ NO BASE64 IMAGES in invoices\n');
    } else {
      console.log(`   ⚠️  FOUND ${invoicesWithBase64} invoices with base64 images\n`);
    }

    // Final verdict
    console.log('='.repeat(60));
    if (ordersWithBase64 === 0 && invoicesWithBase64 === 0) {
      console.log('🎉 DATABASE IS CLEAN - NO BASE64 IMAGES FOUND!');
    } else {
      console.log('⚠️  BASE64 IMAGES STILL EXIST - MIGRATION INCOMPLETE');
      console.log(`   Orders: ${ordersWithBase64}`);
      console.log(`   Invoices: ${invoicesWithBase64}`);
    }
    console.log('='.repeat(60) + '\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verify();
