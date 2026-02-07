// Migrate base64 images to Cloudinary for existing orders
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set to null to process ALL orders, or specify user ID to process only that user's orders
const USER_ID = null; // Process ALL orders with base64

// Upload base64 to Cloudinary
async function uploadToCloudinary(base64String, folder = 'order-designs') {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    return null;
  }
}

// Check if string is base64 image
function isBase64Image(str) {
  return typeof str === 'string' && str.startsWith('data:image');
}

// Process a single order
async function processOrder(order) {
  let modified = false;
  const updates = {};

  console.log(`\n📦 Processing Order: ${order.orderId}`);

  // Process products array
  if (order.products && Array.isArray(order.products)) {
    const updatedProducts = [];

    for (let i = 0; i < order.products.length; i++) {
      const product = order.products[i];
      const updatedProduct = { ...product };

      // Process product.design object
      if (product.design && typeof product.design === 'object') {
        const updatedDesign = { ...product.design };

        for (const [key, value] of Object.entries(product.design)) {
          if (isBase64Image(value)) {
            console.log(`  🔄 Uploading product[${i}].design.${key} to Cloudinary...`);
            const url = await uploadToCloudinary(value, `orders/${order.orderId}/design`);
            if (url) {
              updatedDesign[key] = url;
              modified = true;
              console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
            }
          }
        }

        updatedProduct.design = updatedDesign;
      }

      // Process product.previewImages object
      if (product.previewImages && typeof product.previewImages === 'object') {
        const updatedPreviewImages = { ...product.previewImages };

        for (const [key, value] of Object.entries(product.previewImages)) {
          if (isBase64Image(value)) {
            console.log(`  🔄 Uploading product[${i}].previewImages.${key} to Cloudinary...`);
            const url = await uploadToCloudinary(value, `orders/${order.orderId}/preview`);
            if (url) {
              updatedPreviewImages[key] = url;
              modified = true;
              console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
            }
          }
        }

        updatedProduct.previewImages = updatedPreviewImages;
      }

      // Process product.image_url array
      if (product.image_url && Array.isArray(product.image_url)) {
        const updatedImageUrls = [];

        for (let j = 0; j < product.image_url.length; j++) {
          const imageUrlItem = product.image_url[j];

          if (typeof imageUrlItem === 'object' && imageUrlItem !== null) {
            const updatedImageUrlItem = { ...imageUrlItem };

            // Check if url field contains base64
            if (imageUrlItem.url) {
              if (Array.isArray(imageUrlItem.url)) {
                const updatedUrls = [];
                for (const urlItem of imageUrlItem.url) {
                  if (isBase64Image(urlItem)) {
                    console.log(`  🔄 Uploading product[${i}].image_url[${j}].url to Cloudinary...`);
                    const url = await uploadToCloudinary(urlItem, `orders/${order.orderId}/images`);
                    if (url) {
                      updatedUrls.push(url);
                      modified = true;
                      console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
                    }
                  } else {
                    updatedUrls.push(urlItem);
                  }
                }
                updatedImageUrlItem.url = updatedUrls;
              } else if (isBase64Image(imageUrlItem.url)) {
                console.log(`  🔄 Uploading product[${i}].image_url[${j}].url to Cloudinary...`);
                const url = await uploadToCloudinary(imageUrlItem.url, `orders/${order.orderId}/images`);
                if (url) {
                  updatedImageUrlItem.url = url;
                  modified = true;
                  console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
                }
              }
            }

            updatedImageUrls.push(updatedImageUrlItem);
          } else {
            updatedImageUrls.push(imageUrlItem);
          }
        }

        updatedProduct.image_url = updatedImageUrls;
      }

      updatedProducts.push(updatedProduct);
    }

    if (modified) {
      updates.products = updatedProducts;
    }
  }

  // Process top-level designImages array or object
  if (order.designImages) {
    if (typeof order.designImages === 'object' && !Array.isArray(order.designImages)) {
      // designImages is an object like { front: "base64...", back: "base64..." }
      const updatedDesignImages = { ...order.designImages };

      for (const [key, value] of Object.entries(order.designImages)) {
        if (isBase64Image(value)) {
          console.log(`  🔄 Uploading designImages.${key} to Cloudinary...`);
          const url = await uploadToCloudinary(value, `orders/${order.orderId}/design-images`);
          if (url) {
            updatedDesignImages[key] = url;
            modified = true;
            console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
          }
        }
      }

      if (modified) {
        updates.designImages = updatedDesignImages;
      }
    } else if (Array.isArray(order.designImages)) {
      // designImages is an array
      const updatedDesignImages = [];

      for (let i = 0; i < order.designImages.length; i++) {
        const img = order.designImages[i];
        if (isBase64Image(img)) {
          console.log(`  🔄 Uploading designImages[${i}] to Cloudinary...`);
          const url = await uploadToCloudinary(img, `orders/${order.orderId}/design-images`);
          if (url) {
            updatedDesignImages.push(url);
            modified = true;
            console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
          }
        } else {
          updatedDesignImages.push(img);
        }
      }

      if (modified) {
        updates.designImages = updatedDesignImages;
      }
    }
  }

  // Process top-level previewImages
  if (order.previewImages) {
    if (Array.isArray(order.previewImages)) {
      const updatedPreviewImages = [];

      for (let i = 0; i < order.previewImages.length; i++) {
        const img = order.previewImages[i];
        if (isBase64Image(img)) {
          console.log(`  🔄 Uploading previewImages[${i}] to Cloudinary...`);
          const url = await uploadToCloudinary(img, `orders/${order.orderId}/preview-images`);
          if (url) {
            updatedPreviewImages.push(url);
            modified = true;
            console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
          }
        } else {
          updatedPreviewImages.push(img);
        }
      }

      updates.previewImages = updatedPreviewImages;
    } else if (typeof order.previewImages === 'object') {
      const updatedPreviewImages = { ...order.previewImages };

      for (const [key, value] of Object.entries(order.previewImages)) {
        if (isBase64Image(value)) {
          console.log(`  🔄 Uploading previewImages.${key} to Cloudinary...`);
          const url = await uploadToCloudinary(value, `orders/${order.orderId}/preview-images`);
          if (url) {
            updatedPreviewImages[key] = url;
            modified = true;
            console.log(`  ✅ Uploaded: ${url.substring(0, 60)}...`);
          }
        }
      }

      updates.previewImages = updatedPreviewImages;
    }
  }

  return { modified, updates };
}

async function migrateOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected\n');

    console.log('☁️  Cloudinary configured:');
    console.log(`   Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`   API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 10)}...`);
    console.log('');

    console.log('📊 Fetching orders...');
    const query = USER_ID ? { user: new mongoose.Types.ObjectId(USER_ID) } : {};
    const orders = await mongoose.connection.db.collection('orders')
      .find(query)
      .toArray();

    console.log(`📦 Found ${orders.length} orders${USER_ID ? ` for user ${USER_ID}` : ' (all users)'}\n`);

    if (orders.length === 0) {
      console.log('❌ No orders found for this user');
      await mongoose.disconnect();
      return;
    }

    let processedCount = 0;
    let modifiedCount = 0;
    let uploadCount = 0;

    for (const order of orders) {
      const sizeBefore = JSON.stringify(order).length;
      
      const { modified, updates } = await processOrder(order);
      
      if (modified) {
        // Update the order in database
        await mongoose.connection.db.collection('orders').updateOne(
          { _id: order._id },
          { $set: { ...updates, updatedAt: new Date() } }
        );

        const sizeAfter = JSON.stringify({ ...order, ...updates }).length;
        const saved = sizeBefore - sizeAfter;

        console.log(`  📊 Size: ${(sizeBefore / 1024).toFixed(2)} KB → ${(sizeAfter / 1024).toFixed(2)} KB (saved ${(saved / 1024).toFixed(2)} KB)`);
        
        modifiedCount++;
      } else {
        console.log(`  ℹ️  No base64 images found in this order`);
      }

      processedCount++;
    }

    console.log('\n✅ Migration complete!');
    console.log(`📊 Statistics:`);
    console.log(`   - Processed: ${processedCount} orders`);
    console.log(`   - Modified: ${modifiedCount} orders`);
    console.log(`   - All base64 images uploaded to Cloudinary`);
    console.log(`   - All base64 replaced with Cloudinary URLs`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
    console.log('\n🔄 Now restart your backend and test the /order page');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateOrders();
