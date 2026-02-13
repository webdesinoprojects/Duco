const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

// Use the actual database URI
require('dotenv').config();

mongoose.connect(process.env.DB_URL).then(async () => {
  console.log('Connected to MongoDB Atlas\n');
  
  // Get most recent order
  const recentOrder = await Order.findOne().sort({ createdAt: -1 }).limit(1);
  
  if (recentOrder) {
    console.log('=== MOST RECENT ORDER ===');
    console.log('Order ID:', recentOrder.orderId);
    console.log('Total:', recentOrder.total);
    console.log('Payment Mode:', recentOrder.paymentmode);
    console.log('Discount:', JSON.stringify(recentOrder.discount, null, 2));
    console.log('Created:', recentOrder.createdAt);
    console.log('\n');
    
    // Find corresponding invoice
    const invoice = await Invoice.findOne({ order: recentOrder._id }).populate('order');
    
    if (invoice) {
      console.log('=== CORRESPONDING INVOICE ===');
      console.log('Invoice Number:', invoice.invoice?.invoiceNumber);
      console.log('Invoice Total:', invoice.total);
      console.log('Invoice Discount Field:', JSON.stringify(invoice.discount, null, 2));
      console.log('Order Discount (via populate):', JSON.stringify(invoice.order?.discount, null, 2));
      console.log('\n');
      
      if (!invoice.discount && invoice.order?.discount) {
        console.log('⚠️ ISSUE FOUND: Invoice has no discount but Order has discount!');
        console.log('This means buildInvoicePayload is not passing discount correctly.');
      } else if (!invoice.discount && !invoice.order?.discount) {
        console.log('⚠️ ISSUE FOUND: Neither Invoice nor Order has discount data!');
        console.log('This means the order was created without applying the coupon discount.');
      } else {
        console.log('✅ Discount data exists in invoice');
      }
    } else {
      console.log('❌ No invoice found for this order\n');
    }
  } else {
    console.log('❌ No orders found in database\n');
  }
  
  // Count total orders and invoices
  const orderCount = await Order.countDocuments();
  const invoiceCount = await Invoice.countDocuments();
  console.log(`\nDatabase Stats: ${orderCount} orders, ${invoiceCount} invoices`);
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
