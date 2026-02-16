const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (const arg of args) {
    const [key, rawValue = ''] = arg.replace(/^--/, '').split('=');
    out[key] = rawValue;
  }
  return out;
};

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const toObjectIds = (ids) =>
  ids
    .map((id) => (mongoose.isValidObjectId(id) ? new mongoose.Types.ObjectId(id) : null))
    .filter(Boolean);

const buildOrderQuery = (options) => {
  const query = {};
  if (options.orderIds.length) {
    query.orderId = { $in: options.orderIds };
  }
  if (options.orderDbIds.length) {
    query._id = { $in: options.orderDbIds };
  }
  if (options.userId) {
    query.user = mongoose.isValidObjectId(options.userId)
      ? new mongoose.Types.ObjectId(options.userId)
      : options.userId;
  }
  if (options.status) {
    query.status = options.status;
  }
  return query;
};

const summarizeOrder = (order) => ({
  id: String(order._id),
  orderId: order.orderId || '(missing orderId)',
  status: order.status,
  createdAt: order.createdAt,
  paymentStatus: order.paymentStatus,
  paymentmode: order.paymentmode,
});

const main = async () => {
  const args = parseArgs();
  const orderIds = parseCsv(args.orderIds || args.orders);
  const orderDbIds = toObjectIds(parseCsv(args.orderDbIds || args.orderDbIds));
  const limit = Number(args.limit || 20);

  const options = {
    orderIds,
    orderDbIds,
    userId: args.userId || '',
    status: args.status || '',
  };

  const dbUrl = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUrl) {
    console.error('Missing DB connection string. Set DB_URL or MONGODB_URI in Duco_Backend/.env');
    process.exit(1);
  }

  await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');

  const query = buildOrderQuery(options);
  let ordersQuery = Order.find(query).sort({ createdAt: -1 });
  if (!options.orderIds.length && !options.orderDbIds.length) {
    ordersQuery = ordersQuery.limit(limit);
  }
  const orders = await ordersQuery.exec();

  if (!orders.length) {
    console.log('No matching orders found.');
    await mongoose.disconnect();
    return;
  }

  const results = [];
  for (const order of orders) {
    const invoice = await Invoice.findOne({ order: order._id })
      .select({ 'invoice.number': 1, 'invoice.date': 1, total: 1, createdAt: 1, order: 1 })
      .lean();

    results.push({
      order: summarizeOrder(order),
      invoice: invoice
        ? {
            id: String(invoice._id),
            number: invoice.invoice?.number || '(missing number)',
            date: invoice.invoice?.date || '(missing date)',
            total: invoice.total || 0,
            createdAt: invoice.createdAt,
          }
        : null,
    });
  }

  const found = results.filter((r) => r.invoice);
  const missing = results.filter((r) => !r.invoice);

  console.log('\n=== Invoice Check Summary ===');
  console.log(`Orders checked: ${results.length}`);
  console.log(`Invoices found: ${found.length}`);
  console.log(`Invoices missing: ${missing.length}`);

  if (missing.length) {
    console.log('\n=== Orders Missing Invoices ===');
    missing.forEach((r) => {
      console.log(
        `- ${r.order.orderId} | order _id=${r.order.id} | status=${r.order.status} | created=${r.order.createdAt}`
      );
    });
  }

  if (found.length) {
    console.log('\n=== Orders With Invoices ===');
    found.forEach((r) => {
      console.log(
        `- ${r.order.orderId} | invoice=${r.invoice.number} | invoice _id=${r.invoice.id} | created=${r.invoice.createdAt}`
      );
    });
  }

  const orphanInvoices = await Invoice.aggregate([
    { $match: { order: { $ne: null } } },
    {
      $lookup: {
        from: 'orders',
        localField: 'order',
        foreignField: '_id',
        as: 'orderDoc',
      },
    },
    { $match: { orderDoc: { $size: 0 } } },
    {
      $project: {
        _id: 1,
        order: 1,
        createdAt: 1,
        'invoice.number': 1,
      },
    },
    { $limit: 50 },
  ]);

  if (orphanInvoices.length) {
    console.log('\n=== Orphan Invoices (order missing) ===');
    orphanInvoices.forEach((inv) => {
      const num = inv.invoice?.number || '(missing number)';
      console.log(`- invoice _id=${inv._id} | number=${num} | order=${inv.order}`);
    });
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Script failed:', err.message || err);
  mongoose.disconnect();
  process.exit(1);
});
