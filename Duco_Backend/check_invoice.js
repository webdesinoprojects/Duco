const mongoose = require('mongoose');
const Invoice = require('./DataBase/Models/InvoiceModule');

mongoose.connect('mongodb://localhost:27017/duco').then(async () => {
  const invoice = await Invoice.findOne({ 
    'invoice.invoiceNumber': '698fab424ad2a944215b6f24' 
  }).populate('order');
  
  if (invoice) {
    console.log('\nInvoice Found:');
    console.log('Invoice Number:', invoice.invoice.invoiceNumber);
    console.log('Invoice Discount:', invoice.discount);
    console.log('\nPopulated Order:', invoice.order ? 'Yes' : 'No');
    if (invoice.order) {
      console.log('Order ID:', invoice.order.orderId || invoice.order._id);
      console.log('Order Discount:', invoice.order.discount);
      console.log('Order Total:', invoice.order.total);
    }
  } else {
    console.log('Invoice not found');
    
    // Try to find any recent invoice
    const anyInvoice = await Invoice.findOne().sort({ createdAt: -1 }).populate('order');
    if (anyInvoice) {
      console.log('\nMost recent invoice:');
      console.log('Invoice Number:', anyInvoice.invoice.invoiceNumber);
      console.log('Invoice Discount:', anyInvoice.discount);
      if (anyInvoice.order) {
        console.log('Order Discount:', anyInvoice.order.discount);
      }
    }
  }
  
  mongoose.connection.close();
});
