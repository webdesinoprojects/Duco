require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

const orderId = '6992ddf5a34f38ad0759e046';

async function debugOrder() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      console.log('❌ Order not found:', orderId);
      process.exit(1);
    }

    console.log('📦 ORDER DETAILS:');
    console.log('  Order ID:', order._id);
    console.log('  Order Number:', order.orderId || 'N/A');
    console.log('  Status:', order.status);
    console.log('  Created:', order.createdAt);
    console.log('  Total Pay:', order.totalPay);
    console.log('  Payment Mode:', order.paymentmode);
    console.log('  Order Type:', order.orderType);
    
    console.log('\n📍 BILLING ADDRESS:');
    const billing = order.addresses?.billing || order.address;
    if (billing) {
      console.log('  Name:', billing.fullName || 'N/A');
      console.log('  Address:', billing.houseNumber, billing.street);
      console.log('  City:', billing.city);
      console.log('  State:', billing.state);
      console.log('  Country:', billing.country || 'India');
      console.log('  Pincode:', billing.pincode);
      console.log('  GST:', billing.gstNumber || 'N/A');
    } else {
      console.log('  ❌ NO BILLING ADDRESS');
    }

    console.log('\n🛍️ PRODUCTS:');
    if (order.products && order.products.length > 0) {
      order.products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.products_name || p.name}`);
        console.log('     Quantity:', p.quantity || 'N/A');
        console.log('     Price:', p.price || p.pricing?.[0]?.price_per || 'N/A');
      });
    } else {
      console.log('  ❌ NO PRODUCTS');
    }

    console.log('\n💰 CHARGES:');
    console.log('  P&F:', order.pf || 0);
    console.log('  Printing:', order.printing || 0);
    console.log('  Discount:', JSON.stringify(order.discount || null));

    // Check if invoice exists
    console.log('\n📄 INVOICE CHECK:');
    const invoice = await Invoice.findOne({ order: order._id }).lean();
    if (invoice) {
      console.log('  ✅ Invoice exists:', invoice._id);
      console.log('  Number:', invoice.invoice?.number);
      console.log('  Created:', invoice.createdAt);
    } else {
      console.log('  ❌ NO INVOICE EXISTS');
    }

    console.log('\n🔍 VALIDATION:');
    const issues = [];
    if (!billing || !billing.fullName) issues.push('Missing billing address/name');
    if (!order.products || order.products.length === 0) issues.push('No products');
    if (!order.status) issues.push('No status');
    
    if (issues.length > 0) {
      console.log('  ❌ ISSUES FOUND:');
      issues.forEach(i => console.log('     -', i));
    } else {
      console.log('  ✅ Order looks complete');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
}

debugOrder();
