const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Order = require('../DataBase/Models/OrderModel');
const Invoice = require('../DataBase/Models/InvoiceModule');
const InvoiceHelper = require('../DataBase/Models/InvoiceHelper');
const { createInvoice } = require('../Controller/invoiceService');
const { calculateTax } = require('../Service/TaxCalculationService');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const maskMongoUri = (uri) => {
  if (!uri) return uri;
  return uri.replace(/\/\/([^:]+):([^@]+)@/g, '//$1:****@');
};

const parseDateInput = (value) => {
  if (!value) return null;
  const str = String(value).trim();

  // yyyy-mm-dd
  const iso = new Date(str);
  if (!Number.isNaN(iso.valueOf())) return iso;

  // dd-mm-yyyy
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(str);
  if (m) {
    const dd = m[1];
    const mm = m[2];
    const yyyy = m[3];
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  }

  return null;
};

const buildDayRange = (dateStr) => {
  const base = parseDateInput(dateStr);
  if (!base) return null;
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
};

const pickProductFields = (product = {}) => {
  const fields = [
    'products_name',
    'name',
    'productName',
    'sku',
    'skuCode',
    'productCode',
    'variant',
    'designName',
  ];
  const result = {};
  fields.forEach((key) => {
    if (product[key] !== undefined && product[key] !== null) {
      result[key] = product[key];
    }
  });
  return result;
};

const findMatchingInvoice = async (order) => {
  const orderId = order?.orderId || '';
  const orderObjectId = order?._id;

  const invoice = await Invoice.findOne({
    $or: [
      ...(orderObjectId ? [{ order: orderObjectId }] : []),
      ...(orderId ? [{ orderId: orderId }] : []),
      ...(orderObjectId ? [{ 'invoice.number': String(orderObjectId) }] : []),
    ],
  }).sort({ createdAt: -1 });

  return invoice;
};

const findInvoiceFiles = async (order) => {
  const invoicesDir = path.join(__dirname, '..', 'invoices');
  if (!fs.existsSync(invoicesDir)) return [];

  const orderId = String(order?.orderId || '');
  const orderObjectId = String(order?._id || '');

  const files = await fs.promises.readdir(invoicesDir);
  const matches = files.filter((file) => {
    if (!file.toLowerCase().endsWith('.pdf')) return false;
    const lower = file.toLowerCase();
    return (
      (orderObjectId && lower.includes(orderObjectId.toLowerCase())) ||
      (orderId && lower.includes(orderId.toLowerCase()))
    );
  });

  return matches.map((name) => path.join(invoicesDir, name));
};

const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.valueOf()) ? String(date) : d.toISOString();
};

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

const mapCountryToCurrency = (country = '') => {
  const key = String(country || '').toLowerCase();
  const countryCurrencyMap = {
    india: 'INR',
    'united states': 'USD',
    usa: 'USD',
    'united kingdom': 'GBP',
    uk: 'GBP',
    europe: 'EUR',
    germany: 'EUR',
    france: 'EUR',
    spain: 'EUR',
    italy: 'EUR',
    uae: 'AED',
    dubai: 'AED',
    australia: 'AUD',
    canada: 'CAD',
    singapore: 'SGD',
  };
  return countryCurrencyMap[key] || 'INR';
};

const normalizeTaxType = (type) => {
  if (type === 'INTRASTATE_CGST_SGST') return 'INTRASTATE';
  return type;
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

const computeItemsSubtotal = (items = []) => items.reduce(
  (sum, item) => sum + safeNum(item.price, 0) * safeNum(item.qty, 0),
  0
);

const createInvoiceWithNormalizedTax = async (order, settings) => {
  const payload = buildInvoicePayloadFromOrder(order, settings);
  const itemsSubtotal = computeItemsSubtotal(payload.items);
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
  payload.currency = mapCountryToCurrency(customerCountry);

  const invoice = await Invoice.create(payload);
  return invoice;
};

const isObjectIdString = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

const productContainsKeyword = (products, keyword) => {
  if (!Array.isArray(products) || !keyword) return false;
  const lowerKey = String(keyword).toLowerCase();
  return products.some((product) => {
    const snapshot = pickProductFields(product);
    return Object.values(snapshot).some((v) => String(v).toLowerCase().includes(lowerKey));
  });
};

const deepProductContainsKeyword = (products, keyword) => {
  if (!Array.isArray(products) || !keyword) return false;
  const lowerKey = String(keyword).toLowerCase();
  return products.some((product) => JSON.stringify(product || {}).toLowerCase().includes(lowerKey));
};

const main = async () => {
  const keyword = (process.argv[2] || 'POLO-02').trim();
  const dateStr = (process.argv[3] || '15-02-2026').trim();
  const doFix = process.argv.includes('--fix');
  const dayRange = buildDayRange(dateStr);

  if (!dayRange) {
    console.error('Invalid date. Use dd-mm-yyyy or yyyy-mm-dd.');
    process.exit(1);
  }

  const mongoUri = process.env.DB_URL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing DB_URL in Duco_Backend/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', maskMongoUri(mongoUri));
  console.log('Keyword:', keyword);
  console.log('Date Range (UTC):', dayRange.start.toISOString(), 'to', dayRange.end.toISOString());
  console.log('Fix Mode:', doFix ? 'ON' : 'OFF');

  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const keywordObjectId = isObjectIdString(keyword) ? new mongoose.Types.ObjectId(keyword) : null;

  let orders = await Order.find({
    createdAt: { $gte: dayRange.start, $lte: dayRange.end },
    $or: [
      ...(keywordObjectId ? [{ _id: keywordObjectId }] : []),
      { orderId: regex },
      { 'products.products_name': regex },
      { 'products.name': regex },
      { 'products.productName': regex },
      { 'products.sku': regex },
      { 'products.skuCode': regex },
      { 'products.productCode': regex },
      { 'products.variant': regex },
      { 'products.designName': regex },
    ],
  }).lean();

  if (orders.length === 0) {
    const dayOrders = await Order.find({
      createdAt: { $gte: dayRange.start, $lte: dayRange.end },
    }).lean();

    orders = dayOrders.filter((order) => {
      const matchesOrderId = String(order.orderId || '').toLowerCase().includes(String(keyword).toLowerCase());
      return matchesOrderId || productContainsKeyword(order.products, keyword) || deepProductContainsKeyword(order.products, keyword);
    });
  }

  console.log('Matched Orders:', orders.length);

  let settings = null;
  if (doFix) {
    settings = await InvoiceHelper.findOne({}).lean();
    if (!settings?.company?.name || !settings?.company?.address || !settings?.company?.gstin || !settings?.forCompany) {
      console.error('Invoice helper data is missing or incomplete. Set it in admin first.');
      process.exit(1);
    }
  }

  for (const order of orders) {
    console.log('\n==============================');
    console.log('Order _id:', String(order._id));
    console.log('Order ID:', order.orderId || '(none)');
    console.log('Created At:', formatDate(order.createdAt));
    console.log('Status:', order.status);
    console.log('Payment Status:', order.paymentStatus);
    console.log('Payment Mode:', order.paymentmode);
    console.log('Total Pay:', order.totalPay);
    console.log('Display Price:', order.displayPrice);
    console.log('Customer Email:', order.addresses?.billing?.email || order.address?.email || order.email || '(none)');
    console.log('Invoice URL:', order.invoiceUrl || '(none)');

    const products = Array.isArray(order.products) ? order.products : [];
    console.log('Products Count:', products.length);
    if (products.length > 0) {
      console.log('Product Snapshot:');
      products.slice(0, 5).forEach((p, idx) => {
        console.log(`  [${idx + 1}]`, pickProductFields(p));
      });
    }

    const invoice = await findMatchingInvoice(order);
    if (!invoice) {
      console.log('Invoice Doc:', 'NOT FOUND');
      if (doFix) {
        try {
          const invoicePayload = buildInvoicePayloadFromOrder(order, settings);
          if (!invoicePayload.billTo?.name || !Array.isArray(invoicePayload.items) || invoicePayload.items.length === 0) {
            console.warn('Skipping invoice creation - missing billTo.name or items');
          } else {
            const result = await createInvoice(invoicePayload);
            console.log('Invoice Created:', result?.invoice?._id ? String(result.invoice._id) : 'OK');
          }
        } catch (err) {
          const msg = err?.message || String(err);
          if (msg.includes('tax.type') && msg.includes('INTRASTATE_CGST_SGST')) {
            try {
              const created = await createInvoiceWithNormalizedTax(order, settings);
              console.log('Invoice Created (normalized tax):', created?._id ? String(created._id) : 'OK');
            } catch (fallbackErr) {
              console.error('Invoice create error (normalized tax):', fallbackErr?.message || fallbackErr);
            }
          } else {
            console.error('Invoice create error:', msg);
          }
        }
      }
    } else {
      console.log('Invoice Doc:', 'FOUND');
      console.log('Invoice _id:', String(invoice._id));
      console.log('Invoice Number:', invoice.invoice?.number || '(none)');
      console.log('Invoice Date:', invoice.invoice?.date || '(none)');
      console.log('Invoice Total:', invoice.total);
      console.log('Invoice Currency:', invoice.currency || 'INR');
      console.log('Invoice Created At:', formatDate(invoice.createdAt));
      console.log('Invoice Order Ref:', String(invoice.order || ''));
    }

    const files = await findInvoiceFiles(order);
    if (files.length === 0) {
      console.log('Invoice PDF Files:', 'NONE FOUND');
    } else {
      console.log('Invoice PDF Files:');
      files.forEach((file) => console.log(' -', file));
    }
  }

  if (orders.length === 0) {
    console.log('\nNo orders matched. Try a different keyword or date range.');
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
