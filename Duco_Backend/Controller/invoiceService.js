const Invoice = require("../DataBase/Models/InvoiceModule");
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

  // 3. Add P&F charges to discounted subtotal
  const chargesTotal = ["pf", "printing"].reduce((s, k) => s + safeNum(charges[k]), 0);
  // ✅ TAXABLE VALUE IS NOW BASED ON DISCOUNTED SUBTOTAL
  const taxableValue = discountedSubtotal + chargesTotal;

  // Use dynamic tax rates - handle both GST and international TAX
  const cgstRate = safeNum(tax.cgstRate);
  const sgstRate = safeNum(tax.sgstRate);
  const igstRate = safeNum(tax.igstRate);
  const taxRate = safeNum(tax.taxRate); // For international orders

  // 4. Calculate tax on DISCOUNTED taxable value
  const cgstAmt = (taxableValue * cgstRate) / 100;
  const sgstAmt = (taxableValue * sgstRate) / 100;
  const igstAmt = (taxableValue * igstRate) / 100;
  const taxAmt = (taxableValue * taxRate) / 100; // International tax

  // Total tax calculation based on type:
  // - INTERNATIONAL: 1% TAX
  // - INTRASTATE_IGST: 5% IGST only (Chhattisgarh)
  // - INTERSTATE: 2.5% CGST + 2.5% SGST (other Indian states)
  // - INTRASTATE: Old format with CGST+SGST+IGST
  // - B2C_NO_TAX: 0% (no tax)
  let totalTaxAmt;
  if (tax.type === 'INTERNATIONAL') {
    totalTaxAmt = taxAmt;
  } else if (tax.type === 'INTRASTATE_IGST') {
    totalTaxAmt = igstAmt; // Only IGST for Chhattisgarh
  } else if (tax.type === 'B2C_NO_TAX') {
    totalTaxAmt = 0; // No tax for B2C
  } else {
    totalTaxAmt = cgstAmt + sgstAmt + igstAmt; // INTERSTATE or INTRASTATE
  }
  const grandTotal = taxableValue + totalTaxAmt;

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
  
  // Calculate taxable amount
  const items = Array.isArray(data.items) ? data.items : [];
  const charges = data.charges || {};
  const subtotal = items.reduce((sum, i) => sum + safeNum(i.price) * safeNum(i.qty), 0);
  const chargesTotal = safeNum(charges.pf) + safeNum(charges.printing);
  const taxableAmount = subtotal + chargesTotal;
  
  // ✅ Pass isB2B flag to calculateTax
  const taxInfo = calculateTax(taxableAmount, customerState, customerCountry, isB2B);
  
  console.log('📊 TAX CALCULATION FOR INVOICE:', {
    customerState,
    customerCountry,
    isB2B,
    taxableAmount,
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
  
  // ✅ CRITICAL: Recalculate total based on tax info
  // The frontend sends totalAmount (subtotal + charges), but we need to add tax
  const taxableValue = subtotal + chargesTotal;
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
  const calculatedTotal = taxableValue + totalTaxAmt;
  
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

  const invoiceDoc = await Invoice.findOne(query).sort({ createdAt: -1 }).populate('order');

  if (!invoiceDoc) {
    throw new Error("Invoice not found for this order");
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
  
  // ✅ Compute totals before returning
  const totals = computeTotals(invoiceObj);
  
  console.log('📄 Invoice API Response - Discount Check:');
  console.log('  Invoice Discount:', invoiceObj.discount);
  console.log('  Totals Discount:', totals.discount);
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
