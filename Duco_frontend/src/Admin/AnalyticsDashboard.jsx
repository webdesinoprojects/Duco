// React + Tailwind CSS + Recharts frontend (no shadcn/ui, no extra UI libs)
// - No pagination; shows all orders in range
// - Filters: from, to, groupBy (day/month/none), status (multi), includeCancelled
// - Summary cards, optional breakdown chart, orders table
// - Assumes the backend is available at the same origin: /api/analytics/sales
//   If you use a different origin, set API_BASE accordingly.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { API_BASE_URL } from "../config/api.js";

const API_BASE = `${API_BASE_URL}/`; // Backend API URL

const STATUSES = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

// Currency symbols map
const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  NZD: "NZ$",
  CHF: "CHF",
  JPY: "¥",
  CNY: "¥",
};

// Currency names map
const currencyNames = {
  INR: "Rupees",
  USD: "Dollars",
  EUR: "Euros",
  AED: "Dirhams",
  GBP: "Pounds",
  AUD: "Australian Dollars",
  CAD: "Canadian Dollars",
  SGD: "Singapore Dollars",
};

function formatINR(num) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(num || 0));
  } catch {
    return `₹${Number(num || 0).toFixed(0)}`;
  }
}

// ✅ Format price with currency symbol
function formatPrice(amount, currency = 'INR') {
  const symbol = currencySymbols[currency] || currency;
  const num = Number(amount || 0);
  return `${symbol}${num.toFixed(2)}`;
}

function toInputDate(d) {
  // Date -> yyyy-mm-dd
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDefaultRange(daysBack = 7) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (daysBack - 1));
  return { from: toInputDate(start), to: toInputDate(end) };
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function buildParams({ from, to, groupBy, includeCancelled, statusFilter }) {
  const params = new URLSearchParams();
  params.set("from", from);
  params.set("to", to);
  if (groupBy && groupBy !== "none") params.set("groupBy", groupBy);
  if (includeCancelled) params.set("includeCancelled", "true");
  if (statusFilter?.length) params.set("status", statusFilter.join(","));
  return params.toString();
}

async function tryFetch(url, controller) {
  const res = await fetch(url, { signal: controller?.signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed (${res.status}) @ ${url}`);
  }
  return res.json();
}

function summarizeClientSide(orders = []) {
  const paid = orders.filter((o) => o?.razorpayPaymentId);
  const totalAmount = paid.reduce((sum, o) => sum + Number(o?.price || 0), 0);
  const totalOrders = paid.length;
  const avgOrderValue = totalOrders ? Math.round(totalAmount / totalOrders) : 0;
  return { totalAmount, totalOrders, avgOrderValue };
}

export default function AnalyticsDashboard() {
  const { from: _from, to: _to } = getDefaultRange(7);
  const [from, setFrom] = useState(_from);
  const [to, setTo] = useState(_to);
  const [groupBy, setGroupBy] = useState("day"); // "day" | "month" | "none"
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [statusFilter, setStatusFilter] = useState(["Delivered", "Shipped"]); // sensible default

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState({ summary: null, breakdown: [], orders: [] });

  // === Query management ===
  const canQuery = useMemo(() => Boolean(from && to), [from, to]);
  const queryString = useMemo(
    () => buildParams({ from, to, groupBy, includeCancelled, statusFilter }),
    [from, to, groupBy, includeCancelled, statusFilter]
  );
  const debouncedQueryString = useDebounce(queryString, 550);

  const abortRef = useRef(null);

  async function fetchAnalytics(useDebounced = false) {
    if (!canQuery) return;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    // We’ll try these endpoints in order for maximum compatibility with your backend:
    const qs = useDebounced ? debouncedQueryString : queryString;
    const candidates = [
      `/api/sales?${qs}`,
      `/api/analytics/sales?${qs}`,
      `${API_BASE}api/sales?${qs}`,
      `${API_BASE}api/analytics/sales?${qs}`,
    ];

    try {
      let json = null;
      let lastError = null;

      for (const url of candidates) {
        try {
          json = await tryFetch(url, controller);
          if (json) break;
        } catch (e) {
          lastError = e;
          // continue trying next endpoint
        }
      }
      if (!json) throw lastError || new Error("No response from any endpoint.");

      // Normalize payload
      const summary = json.summary || null;
      const breakdown = Array.isArray(json.breakdown) ? json.breakdown : [];
      const orders = Array.isArray(json.orders)
        ? json.orders
        : Array.isArray(json.orders?.items)
          ? json.orders.items
          : [];

      setData({
        summary: summary || summarizeClientSide(orders),
        breakdown,
        orders,
      });
    } catch (e) {
      if (e?.name === "AbortError") return; // ignore
      setError(e?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  // Auto-load on first mount
  useEffect(() => {
    fetchAnalytics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh on filter changes (debounced)
  useEffect(() => {
    if (!canQuery) return;
    fetchAnalytics(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQueryString, canQuery]);

  function toggleStatus(s) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function exportCSV() {
    const rows = [
      [
        "OrderID", 
        "Date(IST)", 
        "Customer Name", 
        "Email", 
        "UserId", 
        "Address Name",
        "Address Line",
        "City",
        "State",
        "Pincode",
        "Country",
        "Phone",
        "Price", 
        "Status", 
        "RazorpayPaymentId"
      ],
      ...data.orders.map((o) => {
        const userObj = typeof o?.user === "object" ? o.user : null;
        const userName = userObj?.name || userObj?.fullName || "";
        const userEmail = userObj?.email || "";
        const userId = userObj?._id || String(o?.user || "");
        
        const billingAddr = o?.addresses?.billing || o?.address;
        const shippingAddr = o?.addresses?.shipping || o?.address;
        const displayAddr = shippingAddr || billingAddr;
        
        return [
          o?._id || "",
          o?.createdAt
            ? new Date(o.createdAt).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })
            : "",
          userName,
          userEmail,
          userId,
          displayAddr?.fullName || displayAddr?.name || "",
          displayAddr?.address || "",
          displayAddr?.city || "",
          displayAddr?.state || "",
          displayAddr?.pincode || "",
          displayAddr?.country || "",
          displayAddr?.phone || "",
          Number(o?.price || 0),
          o?.status || "",
          o?.razorpayPaymentId || "",
        ];
      }),
    ];

    const csv =
      rows
        .map((r) => r.map((x) => `"${String(x).replaceAll(`"`, `""`)}"`).join(","))
        .join("\n") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  function handleEdit(orderId) {
    // Navigate to order management page
    window.location.href = `/admin/order`;
  }

  async function handleViewDetails(order) {
    console.log('🔍 Order Details - Full Order Object:', order);
    console.log('💰 Order Charges - pf:', order.pf, 'printing:', order.printing);
    console.log('📦 Order Products:', order.products);
    
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setLoadingInvoice(true);
    setInvoiceData(null);
    
    // Fetch invoice data for this order
    try {
      const response = await fetch(`${API_BASE}api/invoice/${order._id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📄 Invoice data fetched:', data);
        console.log('💵 Invoice charges:', data.invoice?.charges);
        console.log('📊 Invoice totals:', data.totals);
        setInvoiceData(data.invoice);
      } else {
        console.warn('No invoice found for order:', order._id);
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
    } finally {
      setLoadingInvoice(false);
    }
  }

  function closeDetailsModal() {
    setSelectedOrder(null);
    setShowDetailsModal(false);
    setInvoiceData(null);
  }

  async function handleCancel(orderId) {
    if (!confirm(`Are you sure you want to cancel order ${orderId}?\n\nThis will update the order status to "Cancelled".`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}api/order/update/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Cancelled' }),
      });

      if (response.ok) {
        alert('Order cancelled successfully');
        // Refresh the data
        fetchAnalytics(false);
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to cancel order: ${error.message || error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Error cancelling order: ${error.message}`);
    }
  }

  async function viewInvoice(orderId) {
    try {
      const response = await fetch(`${API_BASE}api/invoice/${orderId}`, {
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
      
      // Generate invoice HTML (same format as OderSection)
      const currency = invoice.currency || 'INR';
      const currencySymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency;
      const currencyName = currencyNames[currency] || "Rupees";
      
      const company = invoice.company || {};
      const invoiceInfo = invoice.invoice || {};
      const billTo = invoice.billTo || {};
      const shipTo = invoice.shipTo || {};
      const items = invoice.items || [];
      const charges = invoice.charges || {};
      const tax = invoice.tax || {};
      const terms = invoice.terms || [];
      const forCompany = invoice.forCompany || company.name || '';
      
      // Calculate subtotal from items if not provided
      let subtotal = totals?.subtotal || 0;
      if (subtotal === 0 && items.length > 0) {
        subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
      }
      const total = totals?.grandTotal || 0;

      const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

        if (num === 0) return 'Zero';
        if (num < 10) return ones[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
        if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
        return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
      };

      const totalInWords = numberToWords(Math.round(total));

      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoiceInfo.number || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #000; background-color: #fff; padding: 20px; width: 210mm; min-height: 297mm; margin: 0 auto; border: 2px solid #000; box-sizing: border-box; }
            @media print { body { border: none; } .print-btn { display: none; } }
            .print-btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #000; padding: 6px; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
          
          <!-- HEADER -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 10px;">
            <div style="font-size: 12px; font-weight: bold;">GSTIN : ${company.gstin || ''}</div>
            <div style="font-size: 12px; font-weight: bold; text-align: right;">${invoiceInfo.copyType || 'Original Copy'}</div>
          </div>

          <!-- COMPANY NAME -->
          <div style="text-align: center; margin-bottom: 15px;">
            <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 5px 0;">${company.name || ''}</h1>
            <p style="font-size: 11px; margin: 2px 0;">${company.address || ''}</p>
            <p style="font-size: 11px; margin: 2px 0;">CIN : ${company.cin || 'U52601CT2020PTC010997'}</p>
            <p style="font-size: 11px; margin: 2px 0;">email : ${company.email || ''}</p>
          </div>

          <div style="border: 1px solid #000; margin-bottom: 0;"></div>

          <!-- INVOICE DETAILS & PLACE OF SUPPLY -->
          <div style="display: flex; border-bottom: 1px solid #000;">
            <div style="flex: 1; padding: 8px; border-right: 1px solid #000;">
              <p style="margin: 2px 0; font-size: 11px;"><span>Invoice No.</span><span style="margin-left: 20px;">: ${invoiceInfo.number || ''}</span></p>
              <p style="margin: 2px 0; font-size: 11px;"><span>Dated</span><span style="margin-left: 52px;">: ${invoiceInfo.date || ''}</span></p>
            </div>
            <div style="flex: 1; padding: 8px;">
              <p style="margin: 2px 0; font-size: 11px;"><span>Place of Supply</span><span style="margin-left: 10px;">: ${invoiceInfo.placeOfSupply || ''}</span></p>
              <p style="margin: 2px 0; font-size: 11px;"><span>Reverse Charge</span><span style="margin-left: 10px;">: N</span></p>
            </div>
          </div>

          <!-- BILLED TO & SHIPPED TO -->
          <div style="display: flex; border-bottom: 1px solid #000;">
            <div style="flex: 1; padding: 8px; border-right: 1px solid #000; min-height: 100px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Billed to :</p>
              <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">${billTo.name || ''}</p>
              <p style="margin: 2px 0; font-size: 11px;">${billTo.address || ''}</p>
              ${billTo.gstin ? `<p style="margin: 5px 0 0 0; font-size: 11px;">GSTIN / UIN : ${billTo.gstin}</p>` : ''}
            </div>
            <div style="flex: 1; padding: 8px; min-height: 100px;">
              <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold;">Shipped to :</p>
              <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">${shipTo?.name || billTo.name || ''}</p>
              <p style="margin: 2px 0; font-size: 11px;">${shipTo?.address || billTo.address || ''}</p>
            </div>
          </div>

          <!-- ITEMS TABLE -->
          <table>
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="text-align: left; width: 30px;">S.N.</th>
                <th style="text-align: left;">Description of Goods</th>
                <th style="text-align: center; width: 60px;">HSN</th>
                <th style="text-align: center; width: 80px;">Qty. Unit</th>
                <th style="text-align: right; width: 70px;">Price</th>
                <th style="text-align: right; width: 90px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${item.description || ''}${item.printSides ? ` (${item.printSides} sides printing)` : ''}</td>
                  <td style="text-align: center;">${item.hsn || '4901101'}</td>
                  <td style="text-align: center;">${item.qty || 0} ${item.unit || 'Pcs.'}</td>
                  <td style="text-align: right;">${Number(item.price || 0).toFixed(2)}</td>
                  <td style="text-align: right;">${(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- TAX SUMMARY -->
          <div style="display: flex; border-top: 1px solid #000;">
            <div style="flex: 1;"></div>
            <div style="width: 350px;">
              <table style="width: 100%; font-size: 11px; border: none;">
                <thead>
                  <tr>
                    <th style="padding: 4px; text-align: left; border: none;"></th>
                    <th style="padding: 4px; text-align: center; border: none; font-weight: bold;">Total Tax</th>
                    <th style="padding: 4px; text-align: right; border: none; font-weight: bold;">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 4px; border: none;">Sub Total</td>
                    <td style="padding: 4px; text-align: center; border: none;">-</td>
                    <td style="padding: 4px; text-align: right; font-weight: bold; border: none;">${subtotal.toFixed(2)}</td>
                  </tr>
                  
                  ${(charges?.pf || 0) > 0 ? `
                    <tr>
                      <td style="padding: 4px; border: none;">P&F Charges</td>
                      <td style="padding: 4px; text-align: center; border: none;">-</td>
                      <td style="padding: 4px; text-align: right; border: none;">${(charges?.pf || 0).toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  
                  ${(charges?.printing || 0) > 0 ? `
                    <tr>
                      <td style="padding: 4px; border: none;">Printing</td>
                      <td style="padding: 4px; text-align: center; border: none;">-</td>
                      <td style="padding: 4px; text-align: right; border: none;">${( (charges?.pf || 0) + (charges?.printing || 0)).toFixed(2)}</td>
                    </tr>
                  ` : ''}
                  
                  ${tax.cgstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : CGST</td><td style="padding: 4px; text-align: center; border: none;">${(tax.cgstAmount || 0).toFixed(2)}</td><td style="padding: 4px; text-align: right; border: none;">${(subtotal + (charges?.pf || 0) + (charges?.printing || 0) + (tax.cgstAmount || 0)).toFixed(2)}</td></tr>` : ''}
                  ${tax.sgstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : SGST</td><td style="padding: 4px; text-align: center; border: none;">${(tax.sgstAmount || 0).toFixed(2)}</td><td style="padding: 4px; text-align: right; border: none;">${(subtotal + (charges?.pf || 0) + (charges?.printing || 0) + (tax.cgstAmount || 0) + (tax.sgstAmount || 0)).toFixed(2)}</td></tr>` : ''}
                  ${tax.igstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : IGST</td><td style="padding: 4px; text-align: center; border: none;">${(tax.igstAmount || 0).toFixed(2)}</td><td style="padding: 4px; text-align: right; border: none;">${(subtotal + (charges?.pf || 0) + (charges?.printing || 0) + (tax.cgstAmount || 0) + (tax.sgstAmount || 0) + (tax.igstAmount || 0)).toFixed(2)}</td></tr>` : ''}
                  
                  ${Math.abs(Math.ceil(total) - total) > 0.01 ? `<tr><td style="padding: 4px; border: none;">Round Off</td><td style="padding: 4px; text-align: center; border: none;">+${(Math.ceil(total) - total).toFixed(2)}</td><td style="padding: 4px; text-align: right; border: none;">${Math.ceil(total).toFixed(2)}</td></tr>` : ''}
                  <tr style="border-top: 1px solid #000; font-weight: bold;">
                    <td style="padding: 4px; border: none;">Grand Total</td>
                    <td style="padding: 4px; text-align: center; border: none;">${items.reduce((sum, it) => sum + Number(it.qty || 0), 0)} ${items[0]?.unit || 'Pcs.'}.</td>
                    <td style="padding: 4px; text-align: right; border: none;">${Math.ceil(total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
<!-- FOUR SUMMARY BOXES -->
<div
  style="
    margin-top: 12px;
    display: flex;
    justify-content: center;
    gap: 16px;
    font-size: 11px;
  "
>
  <!-- Box 1: Taxable Amount -->
  <div
    style="
      flex: 0 0 160px;
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    "
  >
    <div style="font-weight: bold; margin-bottom: 4px;">Taxable Amount</div>
    <div style="text-align: right;">
      ${(
        subtotal +
        (charges?.pf || 0) +
        (charges?.printing || 0)
      ).toFixed(2)}
    </div>
  </div>

  <!-- Box 2: Total Tax -->
  <div
    style="
      flex: 0 0 160px;
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    "
  >
    <div style="font-weight: bold; margin-bottom: 4px;">Total Tax</div>
    <div style="text-align: right;">
      ${(Number(tax.type === 'INTERNATIONAL'
        ? (tax.taxAmount || 0)
        : (totals?.totalTaxAmt || 0)
      )).toFixed(2)}
    </div>
  </div>

  <!-- Box 3: Round Off -->
  <div
    style="
      flex: 0 0 160px;
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    "
  >
    <div style="font-weight: bold; margin-bottom: 4px;">Round Off</div>
    <div style="text-align: right;">
      ${(
        Math.abs(Math.ceil(total) - total) > 0.01
          ? (Math.ceil(total) - total)
          : 0
      ).toFixed(2)}
    </div>
  </div>

  <!-- Box 4: Grand Total -->
  <div
    style="
      flex: 0 0 160px;
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
      background-color: #f5f5f5;
    "
  >
    <div style="font-weight: bold; margin-bottom: 4px;">Grand Total</div>
    <div style="text-align: right;">
      ${Math.ceil(total).toFixed(2)}
    </div>
  </div>
</div>

          <!-- AMOUNT IN WORDS -->
          <div style="margin-top: 10px; font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 10px;">
            ${currencyName} ${totalInWords} Only
          </div>

          <!-- TERMS & SIGNATURE -->
          <div style="display: flex; margin-top: 10px; min-height: 120px;">
            <div style="flex: 1; font-size: 10px; padding-right: 10px;">
              <p style="font-weight: bold; margin-bottom: 5px;">Terms & Conditions</p>
              <p style="margin: 2px 0;">E.& O.E.</p>
              ${terms.map((t, i) => `<p style="margin: 2px 0;">${i + 1}. ${t}</p>`).join('')}
            </div>
            <div style="width: 250px; text-align: right; padding-top: 60px;">
              <p style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">For ${forCompany}</p>
              <p style="font-size: 10px; margin-top: 30px;">Authorised Signatory</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const invoiceWindow = window.open('', '_blank');
      if (!invoiceWindow) {
        alert('Please allow popups to view invoice');
        return;
      }

      invoiceWindow.document.write(invoiceHTML);
      invoiceWindow.document.close();
    } catch (error) {
      alert(`Failed to fetch invoice: ${error.message}`);
    }
  }

  // X-axis label formatter for dates like "2025-09-29" or ISO strings
  const xTickFormatter = (val) => {
    if (!val) return "";
    // If looks like YYYY-MM or YYYY-MM-DD
    if (/^\d{4}-\d{2}(-\d{2})?$/.test(val)) return val;
    // Try to parse ISO
    const d = new Date(val);
    if (!isNaN(d)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return String(val);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Sales Analytics</h1>
            <p className="text-sm text-gray-300">
              Paid orders only (razorpayPaymentId ≠ null)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAnalytics(false)}
              disabled={!canQuery || loading}
              className="inline-flex items-center gap-2 bg-[#E5C870] text-black px-4 py-2 rounded-md disabled:opacity-60"
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <span className="inline-block w-4 h-4">⟳</span>
              )}
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 border border-[#E5C870] text-[#E5C870] px-4 py-2 rounded-md"
            >
              <span className="inline-block w-4 h-4">⇩</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  From
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300 flex items-center gap-2">
                  To
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="w-full bg-[#0B0B0B] border border-[#333] text-white rounded-md px-3 py-2"
                >
                  <option value="none">None</option>
                  <option value="day">Day</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Include Cancelled</label>
                <div className="flex items-center gap-2 p-2 rounded-lg border border-[#333] bg-[#0B0B0B]">
                  <input
                    id="inc-cancelled"
                    type="checkbox"
                    checked={includeCancelled}
                    onChange={(e) => setIncludeCancelled(e.target.checked)}
                    className="accent-[#E5C870]"
                  />
                  <label htmlFor="inc-cancelled" className="text-sm">
                    Include
                  </label>
                </div>
              </div>
            </div>

            {/* Status multi-select */}
            <div className="mt-4">
              <p className="text-sm text-gray-300 mb-2">Status Filter</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1 rounded-full border ${statusFilter.includes(s)
                      ? "bg-[#E5C870] text-black border-[#E5C870]"
                      : "bg-transparent text-gray-300 border-[#333]"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold">
                {data.summary?.totalOrders ?? 0}
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold">
                {formatINR(data.summary?.totalAmount || 0)}
              </p>
            </div>
          </div>
          <div className="bg-[#111] border border-[#222] rounded-2xl">
            <div className="p-4">
              <p className="text-sm text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold">
                {formatINR(data.summary?.avgOrderValue || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Breakdown Chart */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-block w-5 h-5">📊</span>
              <h3 className="font-semibold">
                Breakdown {groupBy !== "none" ? `(by ${groupBy})` : "(disabled)"}
              </h3>
            </div>
            {groupBy === "none" || !data.breakdown?.length ? (
              <div className="text-sm text-gray-400">
                {groupBy === "none"
                  ? "Select a group to view chart."
                  : "No breakdown data for selected filters."}
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.breakdown}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="_id" tick={{ fill: "#d1d5db" }} tickFormatter={xTickFormatter} />
                    <YAxis tick={{ fill: "#d1d5db" }} />
                    <Tooltip
                      formatter={(v, n) =>
                        n === "totalAmount" ? [formatINR(v), "Amount"] : [v, n]
                      }
                      labelFormatter={(val) => `Group: ${xTickFormatter(val)}`}
                      contentStyle={{
                        background: "#0B0B0B",
                        border: "1px solid #333",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="totalAmount" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#111] border border-[#222] rounded-2xl">
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0B0B0B] text-gray-300">
                <tr>
                  <th className="px-4 py-3">Date (IST)</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer Info</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Razorpay</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.orders?.length ? (
                  data.orders.map((o) => {
                    // Extract user info (supports both populated and non-populated)
                    const userObj = typeof o?.user === "object" ? o.user : null;
                    const userName = userObj?.name || userObj?.fullName || "-";
                    const userEmail = userObj?.email || "-";
                    const userId = userObj?._id || String(o?.user || "-");
                    
                    // Extract address (supports both new addresses format and legacy address)
                    const billingAddr = o?.addresses?.billing || o?.address;
                    const shippingAddr = o?.addresses?.shipping || o?.address;
                    const displayAddr = shippingAddr || billingAddr; // Prefer shipping for display
                    
                    const addrName = displayAddr?.fullName || displayAddr?.name || "-";
                    const addrLine = displayAddr?.address || "-";
                    const addrCity = displayAddr?.city || "";
                    const addrState = displayAddr?.state || "";
                    const addrPincode = displayAddr?.pincode || "";
                    const addrCountry = displayAddr?.country || "";
                    const addrPhone = displayAddr?.phone || "";
                    
                    return (
                      <tr
                        key={o?._id}
                        className="border-t border-[#222] hover:bg-[#0B0B0B]"
                      >
                        <td className="px-4 py-3">
                          {o?.createdAt
                            ? new Date(o.createdAt).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                            })
                            : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{o?._id}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 max-w-[200px]">
                            <div className="font-semibold text-white">{userName}</div>
                            <div className="text-xs text-gray-400 truncate" title={userEmail}>
                              {userEmail}
                            </div>
                            <div className="text-xs text-gray-500 font-mono truncate" title={userId}>
                              ID: {userId}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 max-w-[250px]">
                            <div className="font-medium text-sm text-white">{addrName}</div>
                            <div className="text-xs text-gray-400 line-clamp-2" title={addrLine}>
                              {addrLine}
                            </div>
                            <div className="text-xs text-gray-500">
                              {[addrCity, addrState, addrPincode].filter(Boolean).join(", ")}
                            </div>
                            {addrCountry && addrCountry !== "India" && (
                              <div className="text-xs text-blue-400">{addrCountry}</div>
                            )}
                            {addrPhone && (
                              <div className="text-xs text-gray-500">📞 {addrPhone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="font-semibold">
                              {formatPrice(o?.displayPrice || o?.price, o?.currency)}
                            </div>
                            {o?.currency && o?.currency !== 'INR' && (
                              <div className="text-xs text-blue-400">
                                ({o?.currency})
                                {o?.conversionRate && o?.conversionRate !== 1 && (
                                  <span className="ml-1">• ₹{o?.price?.toFixed(2)} INR</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${o?.status === "Delivered"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : o?.status === "Shipped"
                                ? "bg-sky-500/20 text-sky-300"
                                : o?.status === "Processing"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : o?.status === "Pending"
                                    ? "bg-gray-500/20 text-gray-300"
                                    : "bg-red-500/20 text-red-300"
                              }`}
                          >
                            {o?.status || "-"}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs truncate max-w-[180px]"
                          title={o?.razorpayPaymentId || ""}
                        >
                          {o?.razorpayPaymentId || ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(o)}
                              className="px-3 py-1 bg-[#E5C870] text-black rounded text-xs hover:bg-[#D4B752] transition font-semibold"
                              title="View Full Details"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => handleEdit(o?._id)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                              title="View/Edit Order"
                            >
                              Edit
                            </button>
                            {o?.status !== 'Cancelled' && (
                              <button
                                onClick={() => handleCancel(o?._id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                                title="Cancel Order"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No orders for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pb-6">
          Timezone: Asia/Kolkata • Color theme: #0A0A0A / #E5C870 / White
        </div>

        {/* ✅ Detailed Order Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#111] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-[#E5C870]">
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#111] border-b border-[#333] p-6 flex justify-between items-center z-10">
                <h2 className="text-2xl font-bold text-[#E5C870]">Order Details</h2>
                <button
                  onClick={closeDetailsModal}
                  className="text-white hover:text-[#E5C870] text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Order Information */}
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                  <h3 className="text-lg font-semibold text-[#E5C870] mb-4">📦 Order Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Order ID:</span>
                      <p className="text-white font-mono">{selectedOrder._id}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Order Number:</span>
                      <p className="text-white">{selectedOrder.orderId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Created At:</span>
                      <p className="text-white">
                        {new Date(selectedOrder.createdAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>
                      <p className={`font-semibold ${
                        selectedOrder.status === "Delivered" ? "text-emerald-400" :
                        selectedOrder.status === "Shipped" ? "text-sky-400" :
                        selectedOrder.status === "Processing" ? "text-yellow-400" :
                        selectedOrder.status === "Pending" ? "text-gray-400" :
                        "text-red-400"
                      }`}>
                        {selectedOrder.status}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Payment Status:</span>
                      <p className="text-white">{selectedOrder.paymentStatus || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Payment Mode:</span>
                      <p className="text-white">{selectedOrder.paymentmode || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Order Type:</span>
                      <p className="text-white">{selectedOrder.orderType || 'B2C'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Razorpay Payment ID:</span>
                      <p className="text-white font-mono text-xs">{selectedOrder.razorpayPaymentId || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* User Information */}
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                  <h3 className="text-lg font-semibold text-[#E5C870] mb-4">👤 Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {(() => {
                      const userObj = typeof selectedOrder.user === "object" ? selectedOrder.user : null;
                      return (
                        <>
                          <div>
                            <span className="text-gray-400">Name:</span>
                            <p className="text-white">{userObj?.name || userObj?.fullName || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Email:</span>
                            <p className="text-white">{userObj?.email || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Phone:</span>
                            <p className="text-white">{userObj?.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">User ID:</span>
                            <p className="text-white font-mono text-xs">{userObj?._id || String(selectedOrder.user) || 'N/A'}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Billing Address */}
                {(() => {
                  const billingAddr = selectedOrder.addresses?.billing || selectedOrder.address;
                  if (!billingAddr) return null;
                  return (
                    <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                      <h3 className="text-lg font-semibold text-[#E5C870] mb-4">📍 Billing Address</h3>
                      <div className="text-sm space-y-2">
                        <p className="text-white font-semibold">{billingAddr.fullName || billingAddr.name}</p>
                        <p className="text-gray-300">{billingAddr.houseNumber}, {billingAddr.street}</p>
                        <p className="text-gray-300">{billingAddr.city}, {billingAddr.state} - {billingAddr.pincode}</p>
                        <p className="text-gray-300">{billingAddr.country}</p>
                        <p className="text-gray-300">📞 {billingAddr.mobileNumber || billingAddr.phone}</p>
                        {billingAddr.gstNumber && (
                          <p className="text-blue-400">GST: {billingAddr.gstNumber}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Shipping Address */}
                {(() => {
                  const shippingAddr = selectedOrder.addresses?.shipping;
                  if (!shippingAddr || selectedOrder.addresses?.sameAsBilling) return null;
                  return (
                    <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                      <h3 className="text-lg font-semibold text-[#E5C870] mb-4">🚚 Shipping Address</h3>
                      <div className="text-sm space-y-2">
                        <p className="text-white font-semibold">{shippingAddr.fullName || shippingAddr.name}</p>
                        <p className="text-gray-300">{shippingAddr.houseNumber}, {shippingAddr.street}</p>
                        <p className="text-gray-300">{shippingAddr.city}, {shippingAddr.state} - {shippingAddr.pincode}</p>
                        <p className="text-gray-300">{shippingAddr.country}</p>
                        <p className="text-gray-300">📞 {shippingAddr.mobileNumber || shippingAddr.phone}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Products */}
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                  <h3 className="text-lg font-semibold text-[#E5C870] mb-4">🛍️ Products</h3>
                  <div className="space-y-3">
                    {selectedOrder.products?.map((product, idx) => (
                      <div key={idx} className="bg-[#111] rounded p-3 border border-[#222]">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{product.products_name || product.name || 'Product'}</p>
                            {product.color && <p className="text-sm text-gray-400">Color: {product.color}</p>}
                            {product.quantity && typeof product.quantity === 'object' && (
                              <p className="text-sm text-gray-400">
                                Sizes: {Object.entries(product.quantity)
                                  .filter(([_, qty]) => qty > 0)
                                  .map(([size, qty]) => `${size} × ${qty}`)
                                  .join(", ")}
                              </p>
                            )}
                            {product.design && (
                              <p className="text-sm text-blue-400">Custom Design: Yes</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              {formatPrice(product.price, selectedOrder.currency)}
                            </p>
                            <p className="text-sm text-gray-400">
                              Qty: {typeof product.quantity === 'object' 
                                ? Object.values(product.quantity).reduce((a, b) => a + Number(b || 0), 0)
                                : product.quantity || 1}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complete Bill Breakdown */}
                <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                  <h3 className="text-lg font-semibold text-[#E5C870] mb-4">🧾 Complete Bill Breakdown</h3>
                  {loadingInvoice ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E5C870] mx-auto"></div>
                      <p className="text-gray-400 text-sm mt-2">Loading invoice data...</p>
                    </div>
                  ) : invoiceData ? (
                    <div className="space-y-3">
                      {/* Use Invoice Data */}
                      {(() => {
                        const items = invoiceData.items || [];
                        const subtotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
                        const pf = Number(invoiceData.charges?.pf || 0);
                        const printing = Number(invoiceData.charges?.printing || 0);
                        const taxable = subtotal + pf + printing;
                        
                        const cgst = Number(invoiceData.tax?.cgstAmount || 0);
                        const sgst = Number(invoiceData.tax?.sgstAmount || 0);
                        const igst = Number(invoiceData.tax?.igstAmount || 0);
                        const totalTax = cgst + sgst + igst;
                        
                        const grandTotal = taxable + totalTax;
                        
                        return (
                          <>
                            {/* Items Subtotal */}
                            <div className="bg-[#111] rounded p-3">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-semibold">Items Subtotal</span>
                                <span className="text-white font-semibold">₹{subtotal.toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-gray-400 space-y-1">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.description} × {item.qty}</span>
                                    <span>₹{(Number(item.qty) * Number(item.price)).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Charges */}
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">P&F (Packing & Forwarding) Charges:</span>
                                <span className="text-white">₹{pf.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Printing Charges:</span>
                                <span className="text-white">₹{printing.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Taxable Amount */}
                            <div className="flex justify-between pt-2 border-t border-[#333]">
                              <span className="text-white font-semibold">Taxable Amount:</span>
                              <span className="text-white font-semibold">₹{taxable.toFixed(2)}</span>
                            </div>

                            {/* Tax Breakdown */}
                            <div className="space-y-2 text-sm bg-[#111] rounded p-3">
                              <div className="text-white font-semibold mb-2">Tax Breakdown:</div>
                              {cgst > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">CGST @ {invoiceData.tax?.cgstRate || 0}%:</span>
                                  <span className="text-white">₹{cgst.toFixed(2)}</span>
                                </div>
                              )}
                              {sgst > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">SGST @ {invoiceData.tax?.sgstRate || 0}%:</span>
                                  <span className="text-white">₹{sgst.toFixed(2)}</span>
                                </div>
                              )}
                              {igst > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">IGST @ {invoiceData.tax?.igstRate || 0}%:</span>
                                  <span className="text-white">₹{igst.toFixed(2)}</span>
                                </div>
                              )}
                              {totalTax === 0 && (
                                <div className="text-gray-500 text-xs italic">No tax applied</div>
                              )}
                              {totalTax > 0 && (
                                <div className="flex justify-between pt-2 border-t border-[#222]">
                                  <span className="text-white font-semibold">Total Tax:</span>
                                  <span className="text-white font-semibold">₹{totalTax.toFixed(2)}</span>
                                </div>
                              )}
                            </div>

                            {/* Currency Conversion */}
                            {invoiceData.currency && invoiceData.currency !== 'INR' && (
                              <div className="space-y-2 text-sm bg-blue-900/20 rounded p-3 border border-blue-500/30">
                                <div className="text-blue-400 font-semibold mb-2">💱 International Order:</div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Base Price (INR):</span>
                                  <span className="text-white">₹{grandTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-300">Currency:</span>
                                  <span className="text-white">{invoiceData.currency}</span>
                                </div>
                              </div>
                            )}

                            {/* Grand Total */}
                            <div className="flex justify-between pt-3 border-t-2 border-[#E5C870]">
                              <span className="text-white font-bold text-lg">Grand Total:</span>
                              <span className="text-[#E5C870] font-bold text-xl">₹{grandTotal.toFixed(2)}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-3">
                    {/* Items Subtotal */}
                    <div className="bg-[#111] rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">Items Subtotal</span>
                        <span className="text-white font-semibold">
                          ₹{(() => {
                            // Calculate from products array
                            let itemsTotal = 0;
                            if (selectedOrder.products && selectedOrder.products.length > 0) {
                              itemsTotal = selectedOrder.products.reduce((sum, product) => {
                                const qty = typeof product.quantity === 'object' 
                                  ? Object.values(product.quantity).reduce((a, b) => a + Number(b || 0), 0)
                                  : Number(product.quantity || 1);
                                const price = Number(product.price || 0);
                                return sum + (price * qty);
                              }, 0);
                            }
                            
                            // If still 0, use order price minus charges and tax
                            if (itemsTotal === 0 && selectedOrder.price) {
                              const charges = (selectedOrder.pf || 0) + (selectedOrder.printing || 0);
                              const tax = (selectedOrder.cgst || 0) + (selectedOrder.sgst || 0) + (selectedOrder.igst || 0) || (selectedOrder.gst || 0);
                              itemsTotal = selectedOrder.price - charges - tax;
                            }
                            
                            return Math.max(0, itemsTotal).toFixed(2);
                          })()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {selectedOrder.products?.map((product, idx) => {
                          const qty = typeof product.quantity === 'object' 
                            ? Object.values(product.quantity).reduce((a, b) => a + Number(b || 0), 0)
                            : Number(product.quantity || 1);
                          const price = Number(product.price || 0);
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{product.products_name || product.name || 'Product'} × {qty}</span>
                              <span>₹{(price * qty).toFixed(2)}</span>
                            </div>
                          );
                        })}
                        {(!selectedOrder.products || selectedOrder.products.length === 0) && (
                          <div className="text-gray-500 italic">Product details not available</div>
                        )}
                      </div>
                    </div>

                    {/* Charges */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">P&F (Packing & Forwarding) Charges:</span>
                        <span className="text-white">₹{(selectedOrder.pf || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Printing Charges:</span>
                        <span className="text-white">₹{(selectedOrder.printing || 0).toFixed(2)}</span>
                      </div>
                      {(selectedOrder.pf === 0 && selectedOrder.printing === 0) && (
                        <div className="text-yellow-500 text-xs italic mt-2">
                          ⚠️ Note: This order has no P&F or printing charges. This may be an old order created before charges were implemented, or the charges were not calculated during checkout.
                        </div>
                      )}
                    </div>

                    {/* Taxable Amount */}
                    <div className="flex justify-between pt-2 border-t border-[#333]">
                      <span className="text-white font-semibold">Taxable Amount:</span>
                      <span className="text-white font-semibold">
                        ₹{(() => {
                          // Calculate items total
                          let itemsTotal = 0;
                          if (selectedOrder.products && selectedOrder.products.length > 0) {
                            itemsTotal = selectedOrder.products.reduce((sum, product) => {
                              const qty = typeof product.quantity === 'object' 
                                ? Object.values(product.quantity).reduce((a, b) => a + Number(b || 0), 0)
                                : Number(product.quantity || 1);
                              const price = Number(product.price || 0);
                              return sum + (price * qty);
                            }, 0);
                          }
                          
                          // If still 0, calculate from order price
                          if (itemsTotal === 0 && selectedOrder.price) {
                            const charges = (selectedOrder.pf || 0) + (selectedOrder.printing || 0);
                            const tax = (selectedOrder.cgst || 0) + (selectedOrder.sgst || 0) + (selectedOrder.igst || 0) || (selectedOrder.gst || 0);
                            itemsTotal = selectedOrder.price - charges - tax;
                          }
                          
                          const taxable = itemsTotal + (selectedOrder.pf || 0) + (selectedOrder.printing || 0);
                          return Math.max(0, taxable).toFixed(2);
                        })()}
                      </span>
                    </div>

                    {/* Tax Breakdown */}
                    <div className="space-y-2 text-sm bg-[#111] rounded p-3">
                      <div className="text-white font-semibold mb-2">Tax Breakdown:</div>
                      {selectedOrder.cgst > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">CGST @ {((selectedOrder.cgst / (selectedOrder.price - selectedOrder.gst)) * 100).toFixed(1)}%:</span>
                          <span className="text-white">₹{selectedOrder.cgst?.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.sgst > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">SGST @ {((selectedOrder.sgst / (selectedOrder.price - selectedOrder.gst)) * 100).toFixed(1)}%:</span>
                          <span className="text-white">₹{selectedOrder.sgst?.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.igst > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">IGST @ {((selectedOrder.igst / (selectedOrder.price - selectedOrder.gst)) * 100).toFixed(1)}%:</span>
                          <span className="text-white">₹{selectedOrder.igst?.toFixed(2)}</span>
                        </div>
                      )}
                      {selectedOrder.gst > 0 && !selectedOrder.cgst && !selectedOrder.sgst && !selectedOrder.igst && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">GST @ 5%:</span>
                          <span className="text-white">₹{selectedOrder.gst?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-[#222]">
                        <span className="text-white font-semibold">Total Tax:</span>
                        <span className="text-white font-semibold">
                          ₹{((selectedOrder.cgst || 0) + (selectedOrder.sgst || 0) + (selectedOrder.igst || 0) || selectedOrder.gst || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Currency Conversion (if international) */}
                    {selectedOrder.currency && selectedOrder.currency !== 'INR' && (
                      <div className="space-y-2 text-sm bg-blue-900/20 rounded p-3 border border-blue-500/30">
                        <div className="text-blue-400 font-semibold mb-2">💱 International Order:</div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Base Price (INR):</span>
                          <span className="text-white">₹{selectedOrder.price?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Conversion Rate:</span>
                          <span className="text-white">1 INR = {(1 / (selectedOrder.conversionRate || 1)).toFixed(4)} {selectedOrder.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Customer Pays ({selectedOrder.currency}):</span>
                          <span className="text-blue-400 font-semibold">
                            {formatPrice(selectedOrder.displayPrice, selectedOrder.currency)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between pt-3 border-t-2 border-[#E5C870]">
                      <span className="text-white font-bold text-lg">Grand Total:</span>
                      <span className="text-[#E5C870] font-bold text-xl">
                        ₹{(selectedOrder.totalPay || selectedOrder.price)?.toFixed(2)}
                      </span>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-emerald-900/20 rounded p-3 border border-emerald-500/30 mt-3">
                      <div className="space-y-3">
                        {/* Payment Status */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-emerald-400 font-semibold">Payment Status</div>
                            <div className="text-sm text-gray-300">
                              {selectedOrder.paymentmode || selectedOrder.paymentMethod || 'Online Payment'}
                            </div>
                          </div>
                          <div className={`px-3 py-1 rounded text-sm font-semibold ${
                            (selectedOrder.paymentStatus === 'Paid' || selectedOrder.razorpayPaymentId) 
                              ? 'bg-emerald-500/20 text-emerald-300' :
                            selectedOrder.paymentStatus === 'Pending' 
                              ? 'bg-yellow-500/20 text-yellow-300' :
                            selectedOrder.paymentStatus === 'Failed'
                              ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {selectedOrder.paymentStatus || 
                             (selectedOrder.razorpayPaymentId ? 'Paid' : 'Pending')}
                          </div>
                        </div>

                        {/* Razorpay Payment ID */}
                        {selectedOrder.razorpayPaymentId && (
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Razorpay Payment ID:</div>
                            <div className="text-xs text-white font-mono bg-[#111] rounded px-2 py-1 break-all">
                              {selectedOrder.razorpayPaymentId}
                            </div>
                          </div>
                        )}

                        {/* Payment Date */}
                        {selectedOrder.createdAt && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-400">Payment Date:</span>
                            <span className="text-white">
                              {new Date(selectedOrder.createdAt).toLocaleDateString("en-IN", {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Printrove Information */}
                {selectedOrder.printroveOrderId && (
                  <div className="bg-[#0A0A0A] rounded-lg p-4 border border-[#333]">
                    <h3 className="text-lg font-semibold text-[#E5C870] mb-4">🖨️ Printrove Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Printrove Order ID:</span>
                        <p className="text-white font-mono">{selectedOrder.printroveOrderId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Printrove Status:</span>
                        <p className="text-white">{selectedOrder.printroveStatus || 'N/A'}</p>
                      </div>
                      {selectedOrder.printroveTrackingUrl && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Tracking URL:</span>
                          <a 
                            href={selectedOrder.printroveTrackingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 block truncate"
                          >
                            {selectedOrder.printroveTrackingUrl}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-[#111] border-t border-[#333] p-4 flex justify-end gap-3">
                <button
                  onClick={closeDetailsModal}
                  className="px-6 py-2 bg-[#222] text-white rounded hover:bg-[#333] transition"
                >
                  Close
                </button>
                <button
                  onClick={() => viewInvoice(selectedOrder._id)}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-semibold flex items-center gap-2"
                  title="View Invoice/Bill"
                >
                  🧾 Invoice
                </button>
                <button
                  onClick={() => {
                    closeDetailsModal();
                    handleEdit(selectedOrder._id);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Edit Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
