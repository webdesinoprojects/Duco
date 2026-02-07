// URGENT: Migrate ALL base64 images to Cloudinary (Orders + Invoices)
require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadToCloudinary(base64String, folder = 'migrated-images') {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    return null;
  }
}

async function migrateOrders() {
  console.log('\n📦 MIGRATING ORDERS COLLECTION...\n');
  
  const db = mongoose.connection.db;
  const ordersCollection = db.collection('orders');
  
  const ordersWithBase64 = await ordersCollection.find({
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
  }).toArray();

  console.log(`Found ${ordersWithBase64.length} orders with base64 images\n`);

  let migratedOrders = 0;
  let migratedImages = 0;

  for (const order of ordersWithBase64) {
    console.log(`\n🔄 Processing Order: ${order._id} (${order.orderId || 'N/A'})`);
    let orderUpdated = false;
    const updates = {};

    // Migrate designImages
    if (order.designImages) {
      for (const side of ['front', 'back', 'left', 'right']) {
        const imageData = order.designImages[side];
        if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image/')) {
          console.log(`   Uploading designImages.${side}...`);
          const cloudinaryUrl = await uploadToCloudinary(imageData, 'orders/design-images');
          if (cloudinaryUrl) {
            updates[`designImages.${side}`] = cloudinaryUrl;
            migratedImages++;
            console.log(`   ✅ Uploaded: ${cloudinaryUrl.substring(0, 60)}...`);
            orderUpdated = true;
          }
        }
      }
    }

    // Migrate products[].design
    if (Array.isArray(order.products)) {
      for (let pIdx = 0; pIdx < order.products.length; pIdx++) {
        const product = order.products[pIdx];
        if (product.design) {
          for (const side of ['front', 'back', 'left', 'right']) {
            const imageData = product.design[side];
            if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image/')) {
              console.log(`   Uploading products[${pIdx}].design.${side}...`);
              const cloudinaryUrl = await uploadToCloudinary(imageData, 'orders/product-designs');
              if (cloudinaryUrl) {
                updates[`products.${pIdx}.design.${side}`] = cloudinaryUrl;
                migratedImages++;
                console.log(`   ✅ Uploaded: ${cloudinaryUrl.substring(0, 60)}...`);
                orderUpdated = true;
              }
            }
          }
        }
      }
    }

    // Apply updates
    if (orderUpdated) {
      await ordersCollection.updateOne(
        { _id: order._id },
        { $set: updates }
      );
      migratedOrders++;
      console.log(`   ✅ Order ${order._id} updated`);
    }
  }

  console.log(`\n✅ Orders migration complete: ${migratedOrders} orders, ${migratedImages} images\n`);
  return { orders: migratedOrders, images: migratedImages };
}

async function migrateInvoices() {
  console.log('\n📄 MIGRATING INVOICES COLLECTION...\n');
  
  const db = mongoose.connection.db;
  const invoicesCollection = db.collection('invoices');
  
  const invoicesWithBase64 = await invoicesCollection.find({
    $or: [
      { 'designImages.front': { $regex: '^data:image/' } },
      { 'designImages.back': { $regex: '^data:image/' } },
      { 'designImages.left': { $regex: '^data:image/' } },
      { 'designImages.right': { $regex: '^data:image/' } }
    ]
  }).toArray();

  console.log(`Found ${invoicesWithBase64.length} invoices with base64 images\n`);

  let migratedInvoices = 0;
  let migratedImages = 0;

  for (const invoice of invoicesWithBase64) {
    console.log(`\n🔄 Processing Invoice: ${invoice._id}`);
    let invoiceUpdated = false;
    const updates = {};

    // Migrate designImages
    if (invoice.designImages) {
      for (const side of ['front', 'back', 'left', 'right']) {
        const imageData = invoice.designImages[side];
        if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image/')) {
          console.log(`   Uploading designImages.${side}...`);
          const cloudinaryUrl = await uploadToCloudinary(imageData, 'invoices/design-images');
          if (cloudinaryUrl) {
            updates[`designImages.${side}`] = cloudinaryUrl;
            migratedImages++;
            console.log(`   ✅ Uploaded: ${cloudinaryUrl.substring(0, 60)}...`);
            invoiceUpdated = true;
          }
        }
      }
    }

    // Apply updates
    if (invoiceUpdated) {
      await invoicesCollection.updateOne(
        { _id: invoice._id },
        { $set: updates }
      );
      migratedInvoices++;
      console.log(`   ✅ Invoice ${invoice._id} updated`);
    }
  }

  console.log(`\n✅ Invoices migration complete: ${migratedInvoices} invoices, ${migratedImages} images\n`);
  return { invoices: migratedInvoices, images: migratedImages };
}

async function main() {
  try {
    console.log('🚀 STARTING URGENT BASE64 TO CLOUDINARY MIGRATION\n');
    console.log('='.repeat(80));
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Migrate orders
    const ordersResult = await migrateOrders();

    // Migrate invoices
    const invoicesResult = await migrateInvoices();

    // Final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n✅ Orders: ${ordersResult.orders} documents, ${ordersResult.images} images migrated`);
    console.log(`✅ Invoices: ${invoicesResult.invoices} documents, ${invoicesResult.images} images migrated`);
    console.log(`\n🎉 Total: ${ordersResult.images + invoicesResult.images} images uploaded to Cloudinary\n`);

    await mongoose.connection.close();
    console.log('✅ Connection closed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
