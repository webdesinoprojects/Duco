const mongoose = require('mongoose');
const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  console.log('Connected to MongoDB\n');
  
  // Get most recent order
  const recentOrder = await Order.findOne().sort({ createdAt: -1 });
  
  if (recentOrder) {
    console.log('=== MOST RECENT ORDER ===');
    console.log('Order ID:', recentOrder.orderId);
    console.log('Total:', recentOrder.total);
    console.log('Discount:', JSON.stringify(recentOrder.discount, null, 2));
    console.log('Payment Mode:', recentOrder.paymentmode);
    console.log('Created:', recentOrder.createdAt);
    console.log('\n');
    
    // Find corresponding invoice
    const invoice = await Invoice.findOne({ order: recentOrder._id }).populate('order');
    
    if (invoice) {
      console.log('=== CORRESPONDING INVOICE ===');
      console.log('Invoice Number:', invoice.invoice?.invoiceNumber);
      console.log('Invoice Discount:', JSON.stringify(invoice.discount, null, 2));
      console.log('Invoice Total:', invoice.total);
      console.log('Order Discount (from populate):', JSON.stringify(invoice.order?.discount, null, 2));
      console.log('\n');
    } else {
      console.log('❌ No invoice found for this order');
    }
  } else {
    console.log('❌ No orders found in database');
  }
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
