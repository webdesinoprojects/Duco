// Comprehensive scan of entire database for base64 images
const mongoose = require('mongoose');
require('dotenv').config();

// Check if string is base64 image
function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image');
}

// Recursively scan object for base64
function scanObject(obj, path = '', results = []) {
  if (!obj || typeof obj !== 'object') {
    if (isBase64Image(obj)) {
      results.push({
        path,
        size: obj.length,
        preview: obj.substring(0, 100) + '...'
      });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      scanObject(item, `${path}[${index}]`, results);
    });
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      scanObject(value, newPath, results);
    }
  }

  return results;
}

async function scanDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    const db = mongoose.connection.db;
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections\n`);

    let totalBase64Found = 0;
    let totalBase64Size = 0;
    const collectionResults = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      console.log(`🔍 Scanning collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`   Documents: ${count}`);

      if (count === 0) {
        console.log('   ✅ Empty collection\n');
        continue;
      }

      // Scan all documents in this collection
      const documents = await collection.find({}).toArray();
      let collectionBase64Count = 0;
      let collectionBase64Size = 0;
      const documentsWithBase64 = [];

      for (const doc of documents) {
        const base64Found = scanObject(doc);
        
        if (base64Found.length > 0) {
          const docSize = base64Found.reduce((sum, item) => sum + item.size, 0);
          collectionBase64Count += base64Found.length;
          collectionBase64Size += docSize;
          
          documentsWithBase64.push({
            _id: doc._id,
            identifier: doc.orderId || doc.name || doc.email || doc._id,
            base64Count: base64Found.length,
            base64Size: docSize,
            locations: base64Found
          });
        }
      }

      if (collectionBase64Count > 0) {
        console.log(`   ❌ Found ${collectionBase64Count} base64 images (${(collectionBase64Size / 1024 / 1024).toFixed(2)} MB)`);
        
        collectionResults.push({
          collection: collectionName,
          base64Count: collectionBase64Count,
          base64Size: collectionBase64Size,
          documentsWithBase64
        });

        totalBase64Found += collectionBase64Count;
        totalBase64Size += collectionBase64Size;

        // Show details for each document
        documentsWithBase64.forEach(doc => {
          console.log(`\n   📄 Document: ${doc.identifier}`);
          console.log(`      Base64 count: ${doc.base64Count}`);
          console.log(`      Total size: ${(doc.base64Size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`      Locations:`);
          doc.locations.forEach(loc => {
            console.log(`         - ${loc.path} (${(loc.size / 1024).toFixed(2)} KB)`);
          });
        });
      } else {
        console.log(`   ✅ No base64 images found`);
      }
      
      console.log('');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCAN SUMMARY');
    console.log('='.repeat(80));
    
    if (totalBase64Found === 0) {
      console.log('\n✅ NO BASE64 IMAGES FOUND IN DATABASE!');
      console.log('   All images are using Cloudinary URLs or external URLs.');
    } else {
      console.log(`\n❌ FOUND ${totalBase64Found} BASE64 IMAGES`);
      console.log(`   Total size: ${(totalBase64Size / 1024 / 1024).toFixed(2)} MB`);
      console.log('\n📋 Breakdown by collection:');
      
      collectionResults.forEach(result => {
        console.log(`\n   ${result.collection}:`);
        console.log(`      - ${result.base64Count} base64 images`);
        console.log(`      - ${(result.base64Size / 1024 / 1024).toFixed(2)} MB total`);
        console.log(`      - ${result.documentsWithBase64.length} documents affected`);
      });

      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Run migration script to upload these to Cloudinary:');
      console.log('   node migrate-base64-to-cloudinary.js');
    }

    console.log('\n' + '='.repeat(80));

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('🔍 BASE64 IMAGE SCANNER');
console.log('='.repeat(80));
console.log('This will scan ALL collections in the database for base64 images');
console.log('='.repeat(80) + '\n');

scanDatabase();
