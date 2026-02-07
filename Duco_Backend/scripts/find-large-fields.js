// Find what's making orders large
const mongoose = require('mongoose');
require('dotenv').config();

const USER_ID = '6973d357114bb3182b5aa5b5';

async function findLargeFields() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    console.log('📦 Fetching ONE order to analyze...');
    const order = await mongoose.connection.db.collection('orders')
      .findOne({ user: new mongoose.Types.ObjectId(USER_ID) });
    
    if (!order) {
      console.log('❌ No orders found');
      process.exit(0);
    }

    console.log('📊 Order ID:', order._id);
    console.log('📏 Total size:', (JSON.stringify(order).length / 1024).toFixed(2), 'KB\n');

    // Analyze each top-level field
    console.log('🔍 Field sizes:');
    for (const [key, value] of Object.entries(order)) {
      const size = JSON.stringify(value).length;
      if (size > 1000) {
        console.log(`  ${key}: ${(size / 1024).toFixed(2)} KB`);
        
        // If it's products array, analyze each product
        if (key === 'products' && Array.isArray(value)) {
          value.forEach((product, idx) => {
            const productSize = JSON.stringify(product).length;
            if (productSize > 1000) {
              console.log(`    Product[${idx}]: ${(productSize / 1024).toFixed(2)} KB`);
              
              // Analyze product fields
              for (const [pKey, pValue] of Object.entries(product)) {
                const pSize = JSON.stringify(pValue).length;
                if (pSize > 1000) {
                  console.log(`      ${pKey}: ${(pSize / 1024).toFixed(2)} KB`);
                  
                  // Check if it's base64
                  if (typeof pValue === 'string' && pValue.startsWith('data:image')) {
                    console.log(`        ❌ BASE64 FOUND!`);
                  }
                  
                  // If it's an array, check each item
                  if (Array.isArray(pValue)) {
                    pValue.forEach((item, itemIdx) => {
                      const itemSize = JSON.stringify(item).length;
                      if (itemSize > 1000) {
                        console.log(`        [${itemIdx}]: ${(itemSize / 1024).toFixed(2)} KB`);
                        
                        // Check nested fields
                        if (typeof item === 'object') {
                          for (const [iKey, iValue] of Object.entries(item)) {
                            const iSize = JSON.stringify(iValue).length;
                            if (iSize > 1000) {
                              console.log(`          ${iKey}: ${(iSize / 1024).toFixed(2)} KB`);
                              
                              if (typeof iValue === 'string' && iValue.startsWith('data:image')) {
                                console.log(`            ❌ BASE64 FOUND!`);
                              }
                            }
                          }
                        }
                      }
                    });
                  }
                  
                  // If it's an object, check nested fields
                  if (typeof pValue === 'object' && !Array.isArray(pValue)) {
                    for (const [nKey, nValue] of Object.entries(pValue)) {
                      const nSize = JSON.stringify(nValue).length;
                      if (nSize > 1000) {
                        console.log(`        ${nKey}: ${(nSize / 1024).toFixed(2)} KB`);
                        
                        if (typeof nValue === 'string' && nValue.startsWith('data:image')) {
                          console.log(`          ❌ BASE64 FOUND!`);
                        }
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findLargeFields();
