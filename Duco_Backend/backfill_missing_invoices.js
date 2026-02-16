const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Order = require('./DataBase/Models/OrderModel');
const Invoice = require('./DataBase/Models/InvoiceModule');
const InvoiceHelper = require('./DataBase/Models/InvoiceHelper');
const { createInvoice } = require('./Controller/invoiceService');
const { calculateTax } = require('./Service/TaxCalculationService');

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

const formatDateDDMMYYYY = (date = new Date()) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const safeNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const sumQuantity = (obj) => Object.values(obj || {}).reduce((acc, q) => acc + safeNum(q, 0), 0);

const addressToLine = (a = {}) => {
  const {
    fullName = '',
    houseNumber = '',
    street = '',
    landmark = '',
    city = '',
    state = '',
    pincode = '',
    country = '',
  } = a || {};
  return [
    fullName,
    houseNumber,
    street,
    landmark,
    city,
    state && `${state} - ${pincode}`,
    country,
  ]
    .filter(Boolean)
    .join(', ');
};

const buildInvoiceItems = (products, { hsn = '7307', unit = 'Pcs.' } = {}) => {
  const items = [];
  (products || []).forEach((p) => {
    const qty = sumQuantity(p.quantity);
    if (!qty) return;

    let itemPrice = 0;
    if (p.pricing && Array.isArray(p.pricing) && p.pricing.length > 0) {
      itemPrice = safeNum(p.pricing[0]?.price_per, 0);
    }
    if (itemPrice === 0) {
      itemPrice = safeNum(p.price, 0);
    }

    items.push({
      description: p.products_name || p.name || 'Item',
      barcode: p._id || '',
      hsn,
      qty,
      unit,
      price: itemPrice,
    });
  });
  return items;
};

const buildInvoicePayloadFromOrder = (order, settings) => {
  const billingAddr = order.addresses?.billing || order.address || {};
  const shippingAddr = order.addresses?.shipping || order.address || {};

  const payload = {
    company: settings?.company,
    invoice: {
      number: String(order._id),
      date: formatDateDDMMYYYY(order.createdAt || new Date()),
      placeOfSupply: billingAddr?.state || settings?.invoice?.placeOfSupply,
      reverseCharge: !!settings?.invoice?.reverseCharge,
      copyType: settings?.invoice?.copyType || 'Original Copy',
    },
    billTo: {
      name: billingAddr?.fullName || order.user?.name || '',
      address: addressToLine(billingAddr),
      gstin: billingAddr?.gstNumber?.trim() || '',
      state: billingAddr?.state || '',
      country: billingAddr?.country || 'India',
    },
    items: buildInvoiceItems(order.products || []),
    charges: {
      pf: safeNum(order.pf, 0),
      printing: safeNum(order.printing, 0),
    },
    terms: settings?.terms,
    forCompany: settings?.forCompany,
    order: order._id,
    orderType: order.orderType || 'B2C',
    paymentmode: order.paymentmode || 'online',
    amountPaid: safeNum(order.advancePaidAmount, 0),
    total: safeNum(order.totalPay || order.totalAmount || order.price, 0),
    discount: order.discount || null,
  };

  const isSameAddress = order.addresses?.sameAsBilling || (
    billingAddr && shippingAddr &&
    billingAddr.fullName === shippingAddr.fullName &&
    billingAddr.houseNumber === shippingAddr.houseNumber &&
    billingAddr.street === shippingAddr.street &&
    billingAddr.city === shippingAddr.city &&
    billingAddr.state === shippingAddr.state &&
    billingAddr.pincode === shippingAddr.pincode
  );

  if (order.addresses?.shipping && !isSameAddress) {
    payload.shipTo = {
      name: order.user?.name || '',
      address: addressToLine(shippingAddr),
      state: shippingAddr?.state || '',
      country: shippingAddr?.country || 'India',
    };
  }

  return payload;
};

const normalizeTaxType = (type) => (type === 'INTRASTATE_CGST_SGST' ? 'INTRASTATE' : type);

const createInvoiceWithNormalizedTax = async (order, settings) => {
  const payload = buildInvoicePayloadFromOrder(order, settings);
  const itemsSubtotal = payload.items.reduce(
    (sum, item) => sum + safeNum(item.price, 0) * safeNum(item.qty, 0),
    0
  );
  const chargesTotal = safeNum(payload.charges?.pf, 0) + safeNum(payload.charges?.printing, 0);
  const taxableAmount = itemsSubtotal + chargesTotal;

  const customerState = payload.invoice?.placeOfSupply || payload.billTo?.state || '';
  const customerCountry = payload.billTo?.country || 'India';
  const isB2B = payload.orderType === 'B2B';

  const taxInfo = calculateTax(taxableAmount, customerState, customerCountry, isB2B);
  const normalizedType = normalizeTaxType(taxInfo.type);
  const totalTax = safeNum(taxInfo.totalTax, 0);
  const calculatedTotal = taxableAmount + totalTax;

  payload.tax = {
    cgstRate: taxInfo.cgstRate,
    sgstRate: taxInfo.sgstRate,
    igstRate: taxInfo.igstRate,
    taxRate: taxInfo.taxRate,
    cgstAmount: taxInfo.cgstAmount,
    sgstAmount: taxInfo.sgstAmount,
    igstAmount: taxInfo.igstAmount,
    taxAmount: taxInfo.taxAmount,
    totalTax: taxInfo.totalTax,
    type: normalizedType,
    label: taxInfo.label,
  };

  payload.total = calculatedTotal;

  const invoice = await Invoice.create(payload);
  return invoice;
};

const findInvoiceForOrder = async (order) => {
  const orderId = order?.orderId || '';
  const orderObjectId = order?._id;

  return Invoice.findOne({
    $or: [
      ...(orderObjectId ? [{ order: orderObjectId }] : []),
      ...(orderId ? [{ orderId: orderId }] : []),
      ...(orderObjectId ? [{ 'invoice.number': String(orderObjectId) }] : []),
    ],
  }).sort({ createdAt: -1 });
};

const main = async () => {
  const args = parseArgs();
  const orderIds = parseCsv(args.orderIds || args.orders);
  const orderDbIds = toObjectIds(parseCsv(args.orderDbIds));
  const hasLimit = Object.prototype.hasOwnProperty.call(args, 'limit');
  const limit = hasLimit ? Number(args.limit || 0) : 20;
  const doFix = args.fix === 'true' || args.fix === '1';
  const useAllMissing = args.allMissing === 'true' || args.allMissing === '1';
  const effectiveLimit = useAllMissing && !hasLimit ? 0 : limit;

  const dbUrl = process.env.DB_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUrl) {
    console.error('Missing DB connection string. Set DB_URL or MONGODB_URI in Duco_Backend/.env');
    process.exit(1);
  }

  await mongoose.connect(dbUrl, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB');
  console.log('Fix Mode:', doFix ? 'ON' : 'OFF');

  let settings = null;
  if (doFix) {
    settings = await InvoiceHelper.findOne({}).lean();
    if (!settings?.company?.name || !settings?.company?.address || !settings?.company?.gstin || !settings?.forCompany) {
      console.error('Invoice helper data is missing or incomplete. Set it in admin first.');
      process.exit(1);
    }
  }

  let orders = [];
  if (useAllMissing) {
    const pipeline = [
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'order',
          as: 'invoiceDocs',
        },
      },
      { $match: { invoiceDocs: { $size: 0 } } },
      { $sort: { createdAt: -1 } },
    ];

    if (effectiveLimit > 0) {
      pipeline.push({ $limit: effectiveLimit });
    }

    orders = await Order.aggregate(pipeline);
  } else {
    const query = {};
    if (orderIds.length) query.orderId = { $in: orderIds };
    if (orderDbIds.length) query._id = { $in: orderDbIds };

    let ordersQuery = Order.find(query).sort({ createdAt: -1 });
    if (!orderIds.length && !orderDbIds.length) {
      ordersQuery = ordersQuery.limit(limit);
    }
    orders = await ordersQuery.lean();
  }

  if (!orders.length) {
    console.log('No matching orders found.');
    await mongoose.disconnect();
    return;
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const order of orders) {
    const invoice = await findInvoiceForOrder(order);
    if (invoice) {
      skippedCount += 1;
      console.log(`SKIP: ${order.orderId || order._id} already has invoice ${invoice._id}`);
      continue;
    }

    if (!doFix) {
      console.log(`MISSING: ${order.orderId || order._id} (run with --fix=true to create)`);
      continue;
    }

    try {
      const payload = buildInvoicePayloadFromOrder(order, settings);
      if (!payload.billTo?.name || !Array.isArray(payload.items) || payload.items.length === 0) {
        console.warn(`SKIP: ${order.orderId || order._id} missing billTo.name or items`);
        skippedCount += 1;
        continue;
      }
      const result = await createInvoice(payload);
      const newId = result?.invoice?._id || '(unknown)';
      console.log(`CREATED: ${order.orderId || order._id} -> invoice ${newId}`);
      createdCount += 1;
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('tax.type') && msg.includes('INTRASTATE_CGST_SGST')) {
        try {
          const created = await createInvoiceWithNormalizedTax(order, settings);
          console.log(`CREATED: ${order.orderId || order._id} -> invoice ${created?._id || '(unknown)'}`);
          createdCount += 1;
        } catch (fallbackErr) {
          console.error(`ERROR: ${order.orderId || order._id} -> ${fallbackErr?.message || fallbackErr}`);
        }
      } else {
        console.error(`ERROR: ${order.orderId || order._id} -> ${msg}`);
      }
    }
  }

  console.log('\n=== Backfill Summary ===');
  console.log(`Orders checked: ${orders.length}`);
  console.log(`Invoices created: ${createdCount}`);
  console.log(`Orders skipped: ${skippedCount}`);

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Script failed:', err.message || err);
  mongoose.disconnect();
  process.exit(1);
});
