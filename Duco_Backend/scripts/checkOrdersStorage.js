/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../DataBase/Models/OrderModel');

const MAX_OBJECT_BYTES = 1024 * 1024; // 1MB
const CLOUDINARY_PREFIX = 'https://res.cloudinary.com';

const safeStringify = (value) => {
  const seen = new Set();
  return JSON.stringify(value, (key, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    if (Buffer.isBuffer(val)) return `[Buffer:${val.length}]`;
    return val;
  });
};

const byteSizeOf = (value) => {
  try {
    return Buffer.byteLength(safeStringify(value));
  } catch (err) {
    return -1;
  }
};

const isBase64String = (value) => {
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:') && value.includes('base64,')) return true;
  if (value.length < 1000) return false;
  if (/^https?:\/\//i.test(value)) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
};

const isImageField = (keyPath) =>
  /(image|images|preview|design|url|thumbnail|photo|avatar)/i.test(keyPath);

const isInvoiceField = (keyPath) => /invoice/i.test(keyPath);

const scanValue = (value, path, findings) => {
  if (Buffer.isBuffer(value)) {
    findings.buffers.push(path);
    return;
  }

  if (typeof value === 'string') {
    if (isBase64String(value)) {
      findings.base64.push(path);
    }
    if (isImageField(path)) {
      if (value.startsWith(CLOUDINARY_PREFIX)) {
        findings.cloudinary.push(path);
      } else if (/^https?:\/\//i.test(value)) {
        findings.otherUrls.push(path);
      }
    }
    if (isInvoiceField(path) && !/^https?:\/\//i.test(value)) {
      findings.invoiceNonUrl.push(path);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      scanValue(item, `${path}[${index}]`, findings);
    });
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, val]) => {
      const nextPath = path ? `${path}.${key}` : key;
      scanValue(val, nextPath, findings);
    });
  }
};

const logFieldInfo = (obj, prefix = '') => {
  Object.entries(obj).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    const size = byteSizeOf(value);
    const sizeText = size >= 0 ? `${size} bytes` : 'unknown';

    console.log(`- ${path}: ${type} (${sizeText})`);

    if (size > MAX_OBJECT_BYTES) {
      console.warn(`  ⚠️ Large field >1MB: ${path} (${size} bytes)`);
    }

    if (value && typeof value === 'object' && !Buffer.isBuffer(value)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item && typeof item === 'object') {
            logFieldInfo(item, `${path}[${index}]`);
          }
        });
      } else {
        logFieldInfo(value, path);
      }
    }
  });
};

const runAudit = async () => {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error('❌ DB_URL not set in environment');
    process.exit(1);
  }

  console.log('🔍 Connecting to MongoDB...');
  await mongoose.connect(dbUrl, {
    autoIndex: false,
    maxPoolSize: 5,
  });
  console.log('✅ Connected');

  const orders = await Order.find({}).sort({ createdAt: -1 }).limit(20).lean();
  console.log(`📦 Found ${orders.length} orders`);

  orders.forEach((order, index) => {
    console.log(`\n========================`);
    console.log(`Order #${index + 1}`);
    console.log(`Order ID: ${order._id || order.orderId || 'N/A'}`);
    console.log(`User ID: ${order.user || order.userId || 'N/A'}`);
    console.log(`Total: ${order.totalPay || order.price || order.total || 'N/A'}`);
    console.log(`Items count: ${Array.isArray(order.items) ? order.items.length : Array.isArray(order.products) ? order.products.length : 0}`);

    const findings = {
      base64: [],
      buffers: [],
      cloudinary: [],
      otherUrls: [],
      invoiceNonUrl: [],
    };

    scanValue(order, '', findings);

    console.log('\nField audit:');
    logFieldInfo(order);

    if (findings.base64.length > 0) {
      console.warn('⚠️ Base64 strings detected:');
      findings.base64.forEach((p) => console.warn(`  - ${p}`));
    }

    if (findings.buffers.length > 0) {
      console.warn('⚠️ Buffer fields detected:');
      findings.buffers.forEach((p) => console.warn(`  - ${p}`));
    }

    if (findings.invoiceNonUrl.length > 0) {
      console.warn('⚠️ Invoice fields not stored as URL:');
      findings.invoiceNonUrl.forEach((p) => console.warn(`  - ${p}`));
    }

    const cloudinaryCount = findings.cloudinary.length;
    const otherUrlCount = findings.otherUrls.length;
    if (cloudinaryCount > 0) {
      console.log(`✅ Cloudinary URLs detected: ${cloudinaryCount}`);
    }
    if (otherUrlCount > 0) {
      console.log(`ℹ️ Non-Cloudinary URLs detected: ${otherUrlCount}`);
    }
  });

  await mongoose.disconnect();
  console.log('\n✅ Audit complete');
};

runAudit().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
