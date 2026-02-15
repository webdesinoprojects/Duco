const mongoose = require('mongoose');
const path = require('path');
const Order = require('../DataBase/Models/OrderModel');
const Invoice = require('../DataBase/Models/InvoiceModule');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const maskMongoUri = (uri) => {
  if (!uri) return uri;
  return uri.replace(/\/\/([^:]+):([^@]+)@/g, '//$1:****@');
};

const isObjectIdString = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

const main = async () => {
  const ids = process.argv.slice(2).map((id) => String(id).trim()).filter(Boolean);
  if (ids.length === 0) {
    console.error('Provide one or more order _id values.');
    process.exit(1);
  }

  const mongoUri = process.env.DB_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing DB_URL in Duco_Backend/.env');
    process.exit(1);
  }

  const objectIds = ids.filter(isObjectIdString);
  if (objectIds.length === 0) {
    console.error('No valid ObjectId values provided.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', maskMongoUri(mongoUri));

  const orders = await Order.find({ _id: { $in: objectIds } }).select({ _id: 1, orderId: 1 });
  console.log('Orders to delete:', orders.length);
  orders.forEach((order) => {
    console.log(' -', String(order._id), order.orderId || '(no orderId)');
  });

  const invoiceDelete = await Invoice.deleteMany({ order: { $in: objectIds } });
  const orderDelete = await Order.deleteMany({ _id: { $in: objectIds } });

  console.log('Deleted invoices:', invoiceDelete.deletedCount);
  console.log('Deleted orders:', orderDelete.deletedCount);

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Script error:', err.message || err);
  process.exit(1);
});
