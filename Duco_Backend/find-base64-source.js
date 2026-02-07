// Find the exact order with base64 to debug
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

async function findBase64Source() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Find the order with base64
    console.log('🔍 Finding order with base64...\n');
    const order = await db.collection('orders').findOne({
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
    }, { sort: { createdAt: -1 } });

    if (order) {
      console.log('📦 FOUND ORDER WITH BASE64:');
      console.log('   Order ID:', order._id);
      console.log('   Order Number:', order.orderId);
      console.log('   Created:', order.createdAt);
      console.log('   Status:', order.status);
      console.log('\n📸 Checking designImages:');
      
      if (order.designImages) {
        for (const [key, value] of Object.entries(order.designImages)) {
          if (typeof value === 'string') {
            const isBase64 = value.startsWith('data:image/');
            const size = Buffer.byteLength(value, 'utf8');
            console.log(`   ${key}: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${formatBytes(size)})`);
            if (isBase64) {
              console.log(`      Preview: ${value.substring(0, 80)}...`);
            } else {
              console.log(`      URL: ${value}`);
            }
          }
        }
      } else {
        console.log('   No designImages field');
      }

      console.log('\n📦 Checking products:');
      if (Array.isArray(order.products)) {
        order.products.forEach((product, idx) => {
          console.log(`\n   Product ${idx}:`);
          console.log(`      Name: ${product.products_name || product.name}`);
          
          if (product.design) {
            console.log('      Design:');
            for (const [key, value] of Object.entries(product.design)) {
              if (typeof value === 'string') {
                const isBase64 = value.startsWith('data:image/');
                const size = Buffer.byteLength(value, 'utf8');
                console.log(`         ${key}: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${formatBytes(size)})`);
              }
            }
          }

          if (product.previewImages) {
            console.log('      PreviewImages:');
            for (const [key, value] of Object.entries(product.previewImages)) {
              if (typeof value === 'string') {
                const isBase64 = value.startsWith('data:image/');
                const size = Buffer.byteLength(value, 'utf8');
                console.log(`         ${key}: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${formatBytes(size)})`);
              }
            }
          }
        });
      }
    } else {
      console.log('✅ No orders with base64 found');
    }

    // Find the invoice with base64
    console.log('\n\n🔍 Finding invoice with base64...\n');
    const invoice = await db.collection('invoices').findOne({
      $or: [
        { 'designImages.front': { $regex: '^data:image/' } },
        { 'designImages.back': { $regex: '^data:image/' } },
        { 'designImages.left': { $regex: '^data:image/' } },
        { 'designImages.right': { $regex: '^data:image/' } }
      ]
    }, { sort: { createdAt: -1 } });

    if (invoice) {
      console.log('📄 FOUND INVOICE WITH BASE64:');
      console.log('   Invoice ID:', invoice._id);
      console.log('   Order ID:', invoice.order);
      console.log('   Created:', invoice.createdAt);
      console.log('\n📸 Checking designImages:');
      
      if (invoice.designImages) {
        for (const [key, value] of Object.entries(invoice.designImages)) {
          if (typeof value === 'string') {
            const isBase64 = value.startsWith('data:image/');
            const size = Buffer.byteLength(value, 'utf8');
            console.log(`   ${key}: ${isBase64 ? '❌ BASE64' : '✅ URL'} (${formatBytes(size)})`);
            if (isBase64) {
              console.log(`      Preview: ${value.substring(0, 80)}...`);
            } else {
              console.log(`      URL: ${value}`);
            }
          }
        }
      }
    } else {
      console.log('✅ No invoices with base64 found');
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

findBase64Source();
