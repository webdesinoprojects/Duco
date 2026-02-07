// Detailed scan of ORDERS collection for image data
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

async function scanOrders() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const ordersCollection = db.collection('orders');
    
    const totalOrders = await ordersCollection.countDocuments();
    console.log(`📦 Total orders in database: ${totalOrders}\n`);

    if (totalOrders === 0) {
      console.log('No orders found');
      await mongoose.connection.close();
      return;
    }

    console.log('🔍 Scanning orders for image data...\n');

    let ordersWithIssues = 0;
    let totalIssues = 0;
    const issueDetails = [];

    const cursor = ordersCollection.find();
    let scanned = 0;

    while (await cursor.hasNext()) {
      const order = await cursor.next();
      scanned++;

      const orderIssues = [];

      // Check designImages
      if (order.designImages) {
        const issues = checkForImageData(order.designImages, 'designImages');
        orderIssues.push(...issues);
      }

      // Check products array
      if (Array.isArray(order.products)) {
        order.products.forEach((product, pIdx) => {
          // Check product.design
          if (product.design) {
            const issues = checkForImageData(product.design, `products[${pIdx}].design`);
            orderIssues.push(...issues);
          }

          // Check product.previewImages
          if (product.previewImages) {
            const issues = checkForImageData(product.previewImages, `products[${pIdx}].previewImages`);
            orderIssues.push(...issues);
          }

          // Check product.image_url
          if (product.image_url) {
            const issues = checkForImageData(product.image_url, `products[${pIdx}].image_url`);
            orderIssues.push(...issues);
          }

          // Check product.image
          if (product.image) {
            const issues = checkForImageData(product.image, `products[${pIdx}].image`);
            orderIssues.push(...issues);
          }
        });
      }

      if (orderIssues.length > 0) {
        ordersWithIssues++;
        totalIssues += orderIssues.length;
        issueDetails.push({
          orderId: order._id,
          orderNumber: order.orderId,
          createdAt: order.createdAt,
          issues: orderIssues
        });
      }

      // Progress
      if (scanned % 10 === 0) {
        process.stdout.write(`\r   Scanned: ${scanned}/${totalOrders}`);
      }
    }

    console.log(`\r   Scanned: ${scanned}/${totalOrders} ✅\n`);

    // Report
    console.log('='.repeat(80));
    console.log('📋 SCAN RESULTS');
    console.log('='.repeat(80));

    if (totalIssues === 0) {
      console.log('\n✅ NO IMAGE DATA FOUND IN ORDERS!');
      console.log('   All orders contain only Cloudinary URLs.\n');
    } else {
      console.log(`\n⚠️  FOUND ${totalIssues} ISSUES IN ${ordersWithIssues} ORDERS\n`);

      // Show first 5 problematic orders
      issueDetails.slice(0, 5).forEach((detail, idx) => {
        console.log(`\n${idx + 1}. Order ID: ${detail.orderId}`);
        console.log(`   Order Number: ${detail.orderNumber || 'N/A'}`);
        console.log(`   Created: ${detail.createdAt ? new Date(detail.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   Issues found: ${detail.issues.length}`);
        
        detail.issues.forEach(issue => {
          console.log(`      - ${issue.type} in ${issue.path} (${issue.size})`);
          if (issue.preview) {
            console.log(`        Preview: ${issue.preview}`);
          }
        });
      });

      if (issueDetails.length > 5) {
        console.log(`\n   ... and ${issueDetails.length - 5} more orders with issues`);
      }

      console.log('\n' + '='.repeat(80));
      console.log('🔧 NEXT STEPS:');
      console.log('='.repeat(80));
      console.log('1. Create migration script to upload images to Cloudinary');
      console.log('2. Replace image data with Cloudinary URLs in orders');
      console.log('3. Re-run this scan to verify cleanup\n');
    }

    // Calculate average order size
    const stats = await ordersCollection.aggregate([
      {
        $project: {
          size: { $bsonSize: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: null,
          avgSize: { $avg: '$size' },
          maxSize: { $max: '$size' },
          minSize: { $min: '$size' }
        }
      }
    ]).toArray();

    if (stats.length > 0) {
      console.log('📊 ORDER SIZE STATISTICS:');
      console.log(`   Average: ${formatBytes(stats[0].avgSize)}`);
      console.log(`   Maximum: ${formatBytes(stats[0].maxSize)}`);
      console.log(`   Minimum: ${formatBytes(stats[0].minSize)}\n`);
    }

    await mongoose.connection.close();
    console.log('✅ Scan complete, connection closed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function checkForImageData(obj, path = '') {
  const issues = [];

  if (!obj) return issues;

  if (typeof obj === 'string') {
    // Check for base64
    if (obj.startsWith('data:image/')) {
      const size = Buffer.byteLength(obj, 'utf8');
      issues.push({
        type: 'BASE64_IMAGE',
        path,
        size: formatBytes(size),
        preview: obj.substring(0, 80) + '...'
      });
    }
    // Check for very long strings
    else if (obj.length > 10000 && !obj.startsWith('http')) {
      const size = Buffer.byteLength(obj, 'utf8');
      issues.push({
        type: 'LARGE_STRING',
        path,
        size: formatBytes(size),
        preview: obj.substring(0, 80) + '...'
      });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      issues.push(...checkForImageData(item, `${path}[${idx}]`));
    });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      issues.push(...checkForImageData(value, newPath));
    });
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

scanOrders();
