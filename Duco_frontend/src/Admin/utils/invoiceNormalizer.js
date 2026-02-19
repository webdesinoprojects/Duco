/**
 * Invoice Normalizer Utility
 * ==========================
 * Standardizes invoice data from backend for use with InvoiceTemplate component
 * Used by all admin panels (OderSection, OrderBulk, AnalyticsDashboard)
 */

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
};

/**
 * Normalize invoice data from backend API response
 * @param {Object} invoice - Raw invoice data from backend
 * @param {Object} totals - Totals object from backend
 * @returns {Object} Normalized invoice data for InvoiceTemplate
 */
export const normalizeInvoiceData = (invoice, totals) => {
  if (!invoice) return null;

  // Extract basic info
  const currency = invoice.currency || 'INR';
  const currencySymbol = currencySymbols[currency] || '₹';
  const paymentmode = invoice.paymentmode || 'online';
  
  // ✅ Get order data for 50% payment tracking
  const order = invoice.order || {};
  const isFullyPaid = order.remainingPaymentId || (order.remainingAmount !== undefined && order.remainingAmount === 0);
  
  // ✅ Calculate correct amounts for 50% payments
  let amountPaid;
  if (paymentmode === '50%') {
    const totalAmount = Number(order.totalPay || order.totalAmount || order.price || 0);
    const paidAmount = Number(order.advancePaidAmount || order.price || 0);
    amountPaid = isFullyPaid ? totalAmount : paidAmount;
  } else {
    amountPaid = invoice.amountPaid || 0;
  }

  // Normalize items
  const items = (invoice.items || []).map((it, i) => ({
    ...it,
    sno: i + 1,
    printSides: it.printSides || it.sides || 0,
  }));

  // Calculate subtotal
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0
  );

  // Extract charges
  const pf = Number(invoice.charges?.pf ?? invoice.pfCharges ?? 0);
  const printing = Number(invoice.charges?.printing ?? invoice.printingCharges ?? 0);

  // Extract tax info from invoice
  const tax = invoice.tax || {};

  // Extract additional files
  const additionalFilesMeta = invoice.additionalFilesMeta || [];

  // Extract payment location info
  const paymentCurrency = invoice.paymentCurrency || currency;
  const customerCountry = invoice.customerCountry || 'India';
  const customerCity = invoice.customerCity || '';
  const customerState = invoice.customerState || '';
  const conversionRate = invoice.conversionRate || 1;

  // Extract discount info (if coupon was applied)
  const discount = invoice.discount || totals?.discount || null;
  const discountAmount = discount?.amount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxableAmount = subtotalAfterDiscount + pf + printing;

  // ✅ FIXED: Calculate correct Grand Total = Taxable Amount + Total Tax
  const totalTax = (totals?.cgstAmt || 0) + (totals?.sgstAmt || 0) + (totals?.igstAmt || 0) + (totals?.taxAmt || 0);
  const grandTotal = taxableAmount + totalTax;

  // ✅ IMPORTANT: Update tax.totalTax to use correct calculated value
  if (totals) {
    tax.cgstAmount = totals.cgstAmt || 0;
    tax.sgstAmount = totals.sgstAmt || 0;
    tax.igstAmount = totals.igstAmt || 0;
    tax.taxAmount = totals.taxAmt || 0; // ✅ International 1% service charge
    tax.totalTax = totalTax; // ✅ Use correctly calculated total tax, not backend value
  }

  return {
    company: invoice.company || {},
    invoice: invoice.invoice || {},
    billTo: invoice.billTo || {},
    shipTo: invoice.shipTo || {},
    items: items,
    charges: { pf, printing },
    tax: tax,
    subtotal: subtotal,
    discount: discount,
    subtotalAfterDiscount: subtotalAfterDiscount,
    taxableAmount: taxableAmount,
    total: grandTotal, // ✅ Always show full total
    terms: invoice.terms || [],
    forCompany: invoice.forCompany || invoice.company?.name || '',
    currency: currency,
    currencySymbol: currencySymbol,
    paymentmode: paymentmode,
    amountPaid: amountPaid, // ✅ Updated to reflect full payment when complete
    isFullyPaid: isFullyPaid, // ✅ Add fully paid status
    additionalFilesMeta: additionalFilesMeta,
    // ✅ Payment currency and location info
    paymentCurrency: paymentCurrency,
    customerCountry: customerCountry,
    customerCity: customerCity,
    customerState: customerState,
    conversionRate: conversionRate,
  };
};

/**
 * Fetch and normalize invoice data from backend
 * @param {String} orderId - Order ID
 * @param {String} apiBase - API base URL
 * @returns {Promise<Object>} Normalized invoice data
 */
export const fetchAndNormalizeInvoice = async (orderId, apiBase) => {
  try {
    // Remove trailing slash from apiBase if present
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const response = await fetch(`${baseUrl}/api/invoice/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'Invoice not found');
    }

    const { invoice, totals } = await response.json();
    return normalizeInvoiceData(invoice, totals);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
};

export default {
  normalizeInvoiceData,
  fetchAndNormalizeInvoice,
};
