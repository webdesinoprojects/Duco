// Comprehensive scan for ALL image data in database
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

async function scanAllCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Scanning ${collections.length} collections for image data...\n`);

    let totalIssues = 0;
    const issuesByCollection = {};

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`\n🔍 Scanning collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      console.log(`   Total documents: ${count}`);

      if (count === 0) {
        console.log('   ⏭️  Empty collection, skipping');
        continue;
      }

      // Get sample document to understand structure
      const sample = await collection.findOne();
      
      // Scan all documents
      const cursor = collection.find();
      let docIndex = 0;
      let collectionIssues = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        docIndex++;
        
        // Check for base64 or large strings in the document
        const issues = findImageData(doc, collectionName, doc._id);
        
        if (issues.length > 0) {
          collectionIssues.push(...issues);
          totalIssues += issues.length;
        }

        // Progress indicator
        if (docIndex % 100 === 0) {
          process.stdout.write(`\r   Scanned: ${docIndex}/${count}`);
        }
      }

      if (docIndex > 0) {
        console.log(`\r   Scanned: ${docIndex}/${count} ✅`);
      }

      if (collectionIssues.length > 0) {
        issuesByCollection[collectionName] = collectionIssues;
        console.log(`   ⚠️  Found ${collectionIssues.length} issues in ${collectionName}`);
      } else {
        console.log(`   ✅ No image data found in ${collectionName}`);
      }
    }

    // Print detailed report
    console.log('\n' + '='.repeat(80));
    console.log('📋 DETAILED REPORT');
    console.log('='.repeat(80));

    if (totalIssues === 0) {
      console.log('\n✅ NO IMAGE DATA FOUND IN DATABASE!');
      console.log('   All collections are clean - only Cloudinary URLs detected.');
    } else {
      console.log(`\n⚠️  TOTAL ISSUES FOUND: ${totalIssues}\n`);

      for (const [collectionName, issues] of Object.entries(issuesByCollection)) {
        console.log(`\n📁 Collection: ${collectionName}`);
        console.log('─'.repeat(80));

        // Group by issue type
        const byType = {};
        issues.forEach(issue => {
          if (!byType[issue.type]) byType[issue.type] = [];
          byType[issue.type].push(issue);
        });

        for (const [type, typeIssues] of Object.entries(byType)) {
          console.log(`\n   ${type}: ${typeIssues.length} occurrences`);
          
          // Show first 3 examples
          typeIssues.slice(0, 3).forEach((issue, idx) => {
            console.log(`\n   Example ${idx + 1}:`);
            console.log(`      Document ID: ${issue.docId}`);
            console.log(`      Field Path: ${issue.path}`);
            console.log(`      Size: ${issue.size}`);
            if (issue.preview) {
              console.log(`      Preview: ${issue.preview}`);
            }
          });

          if (typeIssues.length > 3) {
            console.log(`\n   ... and ${typeIssues.length - 3} more`);
          }
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('🔧 RECOMMENDED ACTIONS:');
      console.log('='.repeat(80));
      console.log('1. Run migration script to upload images to Cloudinary');
      console.log('2. Replace image data with Cloudinary URLs');
      console.log('3. Re-run this scan to verify cleanup');
    }

    await mongoose.connection.close();
    console.log('\n✅ Scan complete, connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function findImageData(obj, collectionName, docId, path = '') {
  const issues = [];

  if (!obj || typeof obj !== 'object') {
    return issues;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    // Skip _id fields
    if (key === '_id') continue;

    if (typeof value === 'string') {
      // Check for base64 images
      if (value.startsWith('data:image/')) {
        const size = Buffer.byteLength(value, 'utf8');
        issues.push({
          type: 'BASE64_IMAGE',
          docId,
          path: currentPath,
          size: formatBytes(size),
          preview: value.substring(0, 100) + '...'
        });
      }
      // Check for very long strings that might be image data
      else if (value.length > 10000 && !value.startsWith('http')) {
        const size = Buffer.byteLength(value, 'utf8');
        issues.push({
          type: 'LARGE_STRING (possible image)',
          docId,
          path: currentPath,
          size: formatBytes(size),
          preview: value.substring(0, 100) + '...'
        });
      }
      // Check for blob/binary indicators
      else if (value.includes('blob:') || value.includes('data:application/')) {
        const size = Buffer.byteLength(value, 'utf8');
        issues.push({
          type: 'BLOB_DATA',
          docId,
          path: currentPath,
          size: formatBytes(size),
          preview: value.substring(0, 100) + '...'
        });
      }
    } else if (Buffer.isBuffer(value)) {
      issues.push({
        type: 'BUFFER_DATA',
        docId,
        path: currentPath,
        size: formatBytes(value.length)
      });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        issues.push(...findImageData(item, collectionName, docId, `${currentPath}[${index}]`));
      });
    } else if (typeof value === 'object' && value !== null) {
      issues.push(...findImageData(value, collectionName, docId, currentPath));
    }
  }

  return issues;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

scanAllCollections();
