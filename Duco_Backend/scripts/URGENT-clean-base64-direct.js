// URGENT: Direct MongoDB update to remove base64 WITHOUT fetching orders first
const mongoose = require('mongoose');
require('dotenv').config();

const USER_ID = '6973d357114bb3182b5aa5b5';

async function cleanBase64Direct() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    console.log('🎯 Targeting user:', USER_ID);
    console.log('🚀 Using direct MongoDB update (NO fetch required)\n');

    // Use MongoDB updateMany to remove base64 fields directly
    const result = await mongoose.connection.db.collection('orders').updateMany(
      { user: new mongoose.Types.ObjectId(USER_ID) },
      {
        $unset: {
          'products.$[].previewImages': '',
          'products.$[].design.previewImages': '',
          'products.$[].design.front.uploadedImage': '',
          'products.$[].design.back.uploadedImage': '',
          'products.$[].design.left.uploadedImage': '',
          'products.$[].design.right.uploadedImage': '',
          'items.$[].previewImages': '',
          'items.$[].design.previewImages': '',
          'items.$[].design.front.uploadedImage': '',
          'items.$[].design.back.uploadedImage': '',
          'items.$[].design.left.uploadedImage': '',
          'items.$[].design.right.uploadedImage': ''
        }
      }
    );

    console.log('✅ Update complete!');
    console.log(`   Matched: ${result.matchedCount} orders`);
    console.log(`   Modified: ${result.modifiedCount} orders\n`);

    console.log('🎉 Done! Now test /order page - should load in <2 seconds');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanBase64Direct();
