const Invoice = require("../DataBase/Models/InvoiceModule");
const Order = require("../DataBase/Models/OrderModel");
const InvoiceHelper = require("../DataBase/Models/InvoiceHelper");
const mongoose = require("mongoose");

// ------- Helpers -------
const safeNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const computeTotals = (doc = {}) => {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const charges = doc.charges || {};
  const tax = doc.tax || {};

  // 1. Calculate base subtotal
  const subtotal = items.reduce((sum, i) => sum + safeNum(i.price) * safeNum(i.qty), 0);

  // 2. Calculate discount on subtotal (if discount exists)
  const discountData = doc.discount || {};
  const discountPercent = safeNum(discountData.discountPercent) || safeNum(discountData.percentage) || 0;
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : 0;
  const discountedSubtotal = subtotal - discountAmount;

  // 3. Add P&F charges
  const chargesTotal = ["pf", "printing"].reduce((s, k) => s + safeNum(charges[k]), 0);
  // ✅ TAX ON NET: Base for tax = Subtotal after discount + P&F (AFTER discount)
  const baseForTax = discountedSubtotal + chargesTotal;

  // Use dynamic tax rates - handle both GST and international TAX
  const cgstRate = safeNum(tax.cgstRate);
  const sgstRate = safeNum(tax.sgstRate);
  const igstRate = safeNum(tax.igstRate);
  const taxRate = safeNum(tax.taxRate); // For international orders

  // 4. Calculate tax on NET (baseForTax = subtotal after discount + P&F)
  const cgstAmt = (baseForTax * cgstRate) / 100;
  const sgstAmt = (baseForTax * sgstRate) / 100;
  const igstAmt = (baseForTax * igstRate) / 100;
  const taxAmt = (baseForTax * taxRate) / 100; // International tax

  // Total tax calculation based on type
  let totalTaxAmt;
  if (tax.type === 'INTERNATIONAL') {
    totalTaxAmt = taxAmt;
  } else if (tax.type === 'INTRASTATE_IGST') {
    totalTaxAmt = igstAmt;
  } else if (tax.type === 'B2C_NO_TAX') {
    totalTaxAmt = 0;
  } else {
    totalTaxAmt = cgstAmt + sgstAmt + igstAmt;
  }
  // ✅ Formula: (Subtotal after discount + P&F) + Tax
  const grandTotal = baseForTax + totalTaxAmt;
  // taxableValue for display: what tax was computed on
  const taxableValue = baseForTax;

  return {
    subtotal: +subtotal.toFixed(2),
    discountAmount: +discountAmount.toFixed(2),
    discountPercent: +discountPercent.toFixed(2),
    discountedSubtotal: +discountedSubtotal.toFixed(2),
    chargesTotal: +chargesTotal.toFixed(2),
    taxableValue: +taxableValue.toFixed(2),
    cgstAmt: +cgstAmt.toFixed(2),
    sgstAmt: +sgstAmt.toFixed(2),
    igstAmt: +igstAmt.toFixed(2),
    taxAmt: +taxAmt.toFixed(2),
    totalTaxAmt: +totalTaxAmt.toFixed(2),
    grandTotal: +grandTotal.toFixed(2),
    totalQty: items.reduce((q, i) => q + safeNum(i.qty), 0),
    // ✅ Store full discount object for reference
    discount: doc.discount || null,
  };
};

/**
 * Build totals from SAVED invoice document with RECALCULATION for correct display.
 * ✅ FIXED: Recalculates taxable amount and tax to use discount-first formula.
 * Used for API and PDF so displayed values are always correct.
 */
function getTotalsFromSavedInvoice(invoiceObj = {}) {
  const items = Array.isArray(invoiceObj.items) ? invoiceObj.items : [];
  const charges = invoiceObj.charges || {};
  const tax = invoiceObj.tax || {};

  const subtotal = items.reduce((sum, i) => sum + safeNum(i.price) * safeNum(i.qty), 0);
  const discountAmount = safeNum(invoiceObj.discount?.amount, 0);
  const discountPercent = safeNum(invoiceObj.discount?.percent, 0);
  const discountedSubtotal = subtotal - discountAmount;
  const chargesTotal = safeNum(charges.pf, 0) + safeNum(charges.printing, 0);
  
  // ✅ CORRECT FORMULA: Taxable = (Subtotal - Discount) + Charges
  const taxableValue = discountedSubtotal + chargesTotal;
  
  // ✅ RECALCULATE TAX based on correct taxable value
  const cgstRate = safeNum(tax.cgstRate, 0);
  const sgstRate = safeNum(tax.sgstRate, 0);
  const igstRate = safeNum(tax.igstRate, 0);
  const intlTaxRate = safeNum(tax.taxRate, 0);
  const taxType = String(tax.type || '').toUpperCase();
  
  const cgstAmt = cgstRate > 0 ? Number((taxableValue * cgstRate / 100).toFixed(2)) : 0;
  const sgstAmt = sgstRate > 0 ? Number((taxableValue * sgstRate / 100).toFixed(2)) : 0;
  const igstAmt = igstRate > 0 ? Number((taxableValue * igstRate / 100).toFixed(2)) : 0;
  const taxAmt = (taxType === 'INTERNATIONAL' || taxType === 'INTERNATIONAL_TAX')
    ? (intlTaxRate > 0 ? Number((taxableValue * intlTaxRate / 100).toFixed(2)) : 0)
    : 0;
  
  let totalTaxAmt = 0;
  if (taxType === 'INTERNATIONAL' || taxType === 'INTERNATIONAL_TAX') {
    totalTaxAmt = taxAmt;
  } else if (taxType === 'B2C_NO_TAX') {
    totalTaxAmt = 0;
  } else if (taxType === 'INTRASTATE_IGST' || taxType === 'INTERSTATE' || taxType === 'OUTSIDE_STATE_IGST') {
    totalTaxAmt = igstAmt;
  } else {
    totalTaxAmt = cgstAmt + sgstAmt + igstAmt;
  }
  
  // ✅ CORRECT FORMULA: Grand Total = Taxable + Tax
  const grandTotal = Number((taxableValue + totalTaxAmt).toFixed(2));
  
  const totalQty = items.reduce((q, i) => q + safeNum(i.qty), 0);

  return {
    subtotal: +subtotal.toFixed(2),
    discountAmount: +discountAmount.toFixed(2),
    discountPercent: +discountPercent.toFixed(2),
    discountedSubtotal: +discountedSubtotal.toFixed(2),
    chargesTotal: +chargesTotal.toFixed(2),
    taxableValue: Number(taxableValue.toFixed(2)),
    totalTaxAmt: Number(totalTaxAmt.toFixed(2)),
    grandTotal: grandTotal,
    cgstAmt: cgstAmt,
    sgstAmt: sgstAmt,
    igstAmt: igstAmt,
    taxAmt: taxAmt,
    totalQty,
    discount: invoiceObj.discount || null,
  };
}

const formatDateDDMMYYYY = (date = new Date()) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const sumQuantity = (obj) => Object.values(obj || {}).reduce((acc, q) => acc + safeNum(q, 0), 0);

const addressToLine = (a = {}) => {
  const {
    fullName = "",
    houseNumber = "",
    street = "",
    landmark = "",
    city = "",
    state = "",
    pincode = "",
    country = "",
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
    .join(", ");
};

const buildInvoiceItems = (products, { hsn = "7307", unit = "Pcs." } = {}) => {
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
      description: p.products_name || p.name || "Item",
      barcode: p._id || "",
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
      copyType: settings?.invoice?.copyType || "Original Copy",
    },
    billTo: {
      name: billingAddr?.fullName || "Customer",
      address: addressToLine(billingAddr),
      gstin: billingAddr?.gstNumber?.trim() || "",
      state: billingAddr?.state || "",
      country: billingAddr?.country || "India",
    },
    items: buildInvoiceItems(order.products || []),
    charges: {
      pf: safeNum(order.pf, 0),
      printing: safeNum(order.printing, 0),
    },
    terms: settings?.terms,
    forCompany: settings?.forCompany,
    order: order._id,
    orderType: order.orderType || "B2C",
    paymentmode: order.paymentmode || "online",
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
      name: order.user?.name || "",
      address: addressToLine(shippingAddr),
      state: shippingAddr?.state || "",
      country: shippingAddr?.country || "India",
    };
  }

  return payload;
};

const createInvoiceFromOrder = async (orderDoc) => {
  const settings = await InvoiceHelper.findOne({}).lean();
  if (!settings?.company?.name || !settings?.company?.address || !settings?.company?.gstin || !settings?.forCompany) {
    throw new Error("Invoice settings are missing or incomplete");
  }

  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  const payload = buildInvoicePayloadFromOrder(order, settings);

  if (!payload.billTo?.name || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Invoice payload missing billTo or items");
  }

  return createInvoice(payload);
};

// Export if you want to reuse in other places
module.exports.computeTotals = computeTotals;

// ------- Functions -------

// Create Invoice (data passed directly)
async function createInvoice(data) {
  // Required by your schema
  if (!data?.company?.name) throw new Error("company.name is required");
  if (!data?.company?.address) throw new Error("company.address is required");
  if (!data?.company?.gstin) throw new Error("company.gstin is required");
  if (!data?.invoice?.number) throw new Error("invoice.number is required");
  if (!data?.invoice?.date) throw new Error("invoice.date is required");
  if (!data?.billTo?.name) throw new Error("billTo.name is required");
  if (!Array.isArray(data?.items) || data.items.length === 0) throw new Error("items[] is required");
  if (!data?.forCompany) throw new Error("forCompany is required");

  // ------- DYNAMIC TAX CALCULATION -------
  const { calculateTax } = require('../Service/TaxCalculationService');
  
  // Calculate tax based on customer location
  const customerState = data.invoice?.placeOfSupply || data.billTo?.state || '';
  const customerCountry = data.billTo?.country || 'India';
  
  // ✅ Determine if this is a B2B order
  const isB2B = data.orderType === 'B2B' || data.isB2B === true || data.isCorporate === true;
  
  // ✅ TAX ON GROSS: Base for tax = Subtotal + P&F (before discount)
  const items = Array.isArray(data.items) ? data.items : [];
  const charges = data.charges || {};
  const subtotal = items.reduce((sum, i) => sum + safeNum(i.price) * safeNum(i.qty), 0);
  const discountData = data.discount || {};
  const discountPercent = safeNum(discountData.discountPercent) || safeNum(discountData.percentage) || 0;
  const discountAmount = discountPercent > 0 ? (subtotal * discountPercent) / 100 : safeNum(discountData.amount, 0);
  const chargesTotal = safeNum(charges.pf) + safeNum(charges.printing);
  const baseForTax = subtotal + chargesTotal;

  // Tax calculated on gross (before discount)
  const taxInfo = calculateTax(baseForTax, customerState, customerCountry, isB2B);
  
  console.log('📊 TAX CALCULATION FOR INVOICE (Tax on Gross):', {
    customerState,
    customerCountry,
    isB2B,
    subtotal,
    discountAmount,
    chargesTotal,
    baseForTax: 'Subtotal + P&F (before discount)',
    baseForTaxValue: baseForTax,
    taxType: taxInfo.type,
    cgstRate: taxInfo.cgstRate,
    sgstRate: taxInfo.sgstRate,
    igstRate: taxInfo.igstRate,
    cgstAmount: taxInfo.cgstAmount,
    sgstAmount: taxInfo.sgstAmount,
    igstAmount: taxInfo.igstAmount,
    totalTax: taxInfo.totalTax
  });
  
  data.tax = {
    cgstRate: taxInfo.cgstRate,
    sgstRate: taxInfo.sgstRate,
    igstRate: taxInfo.igstRate,
    taxRate: taxInfo.taxRate,
    cgstAmount: taxInfo.cgstAmount,
    sgstAmount: taxInfo.sgstAmount,
    igstAmount: taxInfo.igstAmount,
    taxAmount: taxInfo.taxAmount, // ✅ International 1% charge
    totalTax: taxInfo.totalTax,
    type: taxInfo.type,
    label: taxInfo.label
  };
  
  // ✅ Add currency information based on customer country
  const country = (customerCountry || '').toLowerCase();
  const countryCurrencyMap = {
    'india': 'INR',
    'united states': 'USD',
    'usa': 'USD',
    'united kingdom': 'GBP',
    'uk': 'GBP',
    'europe': 'EUR',
    'germany': 'EUR',
    'france': 'EUR',
    'spain': 'EUR',
    'italy': 'EUR',
    'uae': 'AED',
    'dubai': 'AED',
    'australia': 'AUD',
    'canada': 'CAD',
    'singapore': 'SGD',
  };
  data.currency = countryCurrencyMap[country] || 'INR';
  
  // ✅ Ensure orderType is set (default to B2C if not provided)
  if (!data.orderType) {
    data.orderType = 'B2C';
  }
  
  // ✅ TAX ON GROSS: Grand Total = ((Subtotal + P&F) + Tax) - Discount
  let totalTaxAmt;
  if (taxInfo.type === 'INTERNATIONAL') {
    totalTaxAmt = taxInfo.taxAmount;
  } else if (taxInfo.type === 'INTRASTATE_IGST') {
    totalTaxAmt = taxInfo.igstAmount;
  } else if (taxInfo.type === 'B2C_NO_TAX') {
    totalTaxAmt = 0;
  } else {
    totalTaxAmt = taxInfo.cgstAmount + taxInfo.sgstAmount + taxInfo.igstAmount;
  }
  const calculatedTotal = (baseForTax + totalTaxAmt) - discountAmount;
  
  // ✅ Override the total with the correctly calculated value
  data.total = calculatedTotal;
  // --------------------------------------
  
  console.log('💾 Creating invoice with discount:', data.discount);

  const invoice = await Invoice.create(data);
  console.log('✅ Invoice created. Discount saved:', invoice.discount);
  const obj = invoice.toObject();
  const totals = computeTotals(obj);
  return { invoice, totals };
}

async function getInvoiceByOrderId(orderId) {
  const asObjectId = mongoose.isValidObjectId(orderId)
    ? new mongoose.Types.ObjectId(orderId)
    : null;

  const query = {
    $or: [
      ...(asObjectId ? [{ order: asObjectId }] : []),
      { orderId: orderId },
    ],
  };

  let invoiceDoc = await Invoice.findOne(query).sort({ createdAt: -1 }).populate('order');

  if (!invoiceDoc) {
    const orderDoc = asObjectId
      ? await Order.findById(asObjectId)
      : await Order.findOne({ orderId: orderId });

    if (!orderDoc) {
      throw new Error("Invoice not found for this order");
    }

    try {
      const created = await createInvoiceFromOrder(orderDoc);
      const createdInvoice = created?.invoice || created;
      invoiceDoc = await Invoice.findById(createdInvoice?._id).populate("order");
    } catch (err) {
      const msg = err?.message || String(err);
      throw new Error(`Invoice not found for this order (${msg})`);
    }
  }

  const invoiceObj = invoiceDoc.toObject ? invoiceDoc.toObject() : invoiceDoc;
  
  // ✅ Add currency information from order's address (support both formats)
  const billingCountry = invoiceObj.order?.addresses?.billing?.country || invoiceObj.order?.address?.country;
  if (billingCountry) {
    const country = billingCountry.toLowerCase();
    // Map countries to currencies
    const countryCurrencyMap = {
      'india': 'INR',
      'united states': 'USD',
      'usa': 'USD',
      'united kingdom': 'GBP',
      'uk': 'GBP',
      'europe': 'EUR',
      'germany': 'EUR',
      'france': 'EUR',
      'spain': 'EUR',
      'italy': 'EUR',
      'uae': 'AED',
      'dubai': 'AED',
      'australia': 'AUD',
      'canada': 'CAD',
      'singapore': 'SGD',
    };
    
    invoiceObj.currency = countryCurrencyMap[country] || 'INR';
  } else {
    invoiceObj.currency = 'INR';
  }
  
  // ✅ Add conversion rate and display price from order
  if (invoiceObj.order) {
    invoiceObj.conversionRate = invoiceObj.order.conversionRate || 1;
    invoiceObj.displayPrice = invoiceObj.order.displayPrice || invoiceObj.order.price || 0;
    invoiceObj.paymentCurrency = invoiceObj.order.paymentCurrency || 'INR';
    invoiceObj.customerCountry = invoiceObj.order.customerCountry || 'India';
    invoiceObj.customerCity = invoiceObj.order.customerCity || '';
    invoiceObj.customerState = invoiceObj.order.customerState || '';
    // ✅ Add discount from order if not already in invoice (for backward compatibility)
    if (!invoiceObj.discount && invoiceObj.order.discount) {
      invoiceObj.discount = invoiceObj.order.discount;
    }
  }
  
  // ✅ Use SAVED values only (no recalculation of tax/total) so frontend and PDF match DB
  const totals = getTotalsFromSavedInvoice(invoiceObj);
  
  console.log('📄 Invoice API Response (saved totals):');
  console.log('  Invoice Discount:', invoiceObj.discount);
  console.log('  Totals grandTotal:', totals.grandTotal, 'totalTaxAmt:', totals.totalTaxAmt);
  console.log('  Order ID:', invoiceObj.order?._id || invoiceObj.order);
  
  return { invoice: invoiceObj, totals };
}

async function getInvoices(filters = {}) {
  const {
    number,
    gstin,
    forCompany,
    name,
    from,
    to,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = filters;

  const pageN = Math.max(1, parseInt(page, 10));
  const limitN = Math.max(1, parseInt(limit, 10));
  const skipN = (pageN - 1) * limitN;

  const match = {};
  if (number) match["invoice.number"] = { $regex: String(number).trim(), $options: "i" };
  if (gstin) match["billTo.gstin"] = String(gstin).trim();
  if (forCompany) match.forCompany = String(forCompany).trim();
  if (name) match["billTo.name"] = { $regex: String(name).trim(), $options: "i" };

  const sortStage = {};
  String(sort)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((key) => {
      if (key.startsWith("-")) sortStage[key.slice(1)] = -1;
      else sortStage[key] = 1;
    });

  const pipeline = [
    { $match: match },
    {
      $addFields: {
        _parsedDate: {
          $ifNull: [
            {
              $dateFromString: {
                dateString: "$invoice.date",
                format: "%d-%m-%Y",
                onError: null,
                onNull: null,
              },
            },
            {
              $dateFromString: {
                dateString: "$invoice.date",
                onError: null,
                onNull: null,
              },
            },
          ],
        },
      },
    },
  ];

  if (from || to) {
    const parseBound = (s) => {
      if (!s) return null;
      const iso = new Date(s);
      if (!Number.isNaN(iso.valueOf())) return iso;
      const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s));
      if (m) {
        const [_, dd, mm, yyyy] = m;
        return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
      }
      return null;
    };

    const fromDate = parseBound(from);
    const toDate = parseBound(to);

    const dateMatch = {};
    if (fromDate) dateMatch.$gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      dateMatch.$lte = end;
    }
    pipeline.push({ $match: { _parsedDate: dateMatch } });
  }

  pipeline.push(
    { $sort: Object.keys(sortStage).length ? sortStage : { createdAt: -1 } },
    {
      $facet: {
        rows: [{ $skip: skipN }, { $limit: limitN }],
        totalDocs: [{ $count: "count" }],
      },
    },
    {
      $project: {
        rows: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$totalDocs.count", 0] }, 0] },
      },
    }
  );

  const [agg] = await Invoice.aggregate(pipeline);
  const rows = agg?.rows || [];
  const total = agg?.total || 0;

  const populated = await Invoice.populate(rows, { path: "order" });

  const data = populated.map((inv) => {
    const obj = inv;
    delete obj._parsedDate;
    return { invoice: obj, totals: computeTotals(obj) };
  });

  return { total, page: pageN, limit: limitN, data };
}

async function getInvoiceByNumber(number) {
  const invoice = await Invoice.findOne({ "invoice.number": String(number).trim() }).populate("order");
  if (!invoice) throw new Error("Invoice not found");
  const totals = computeTotals(invoice.toObject());
  return { invoice, totals };
}

module.exports.createInvoice = createInvoice;
module.exports.getInvoiceByOrderId = getInvoiceByOrderId;
module.exports.getInvoices = getInvoices;
module.exports.getInvoiceByNumber = getInvoiceByNumber;
