import React, { useEffect,useMemo, useState } from "react";
import OrderDetailsCard from "../Admin/Components/OrderDetailsCard"; // <-- make sure path is correct

const statusClass = (s = "") => {
  switch (s) {
    case "Pending": return "bg-amber-500 text-white";
    case "Processing": return "bg-sky-500 text-white";
    case "Shipped": return "bg-purple-500 text-white";
    case "Delivered": return "bg-emerald-500 text-white";
    case "Cancelled": return "bg-rose-500 text-white";
    default: return "bg-gray-400 text-white";
  }
};

// ✅ Helper function to convert number to words
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

// ✅ Generate invoice HTML for display (matching OrderSuccess.jsx template)
const generateInvoiceHTML = (invoice, totals) => {
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
  
  const subtotal = totals?.subtotal || 0;
  const total = totals?.grandTotal || 0;
  const totalInWords = numberToWords(Math.round(total));
  
  return `
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
            <th style="text-align: center; width: 80px;">BARCODE</th>
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
              <td style="text-align: center;">${item.barcode || '000002'}</td>
              <td style="text-align: center;">${item.hsn || '4901101'}</td>
              <td style="text-align: center;">${item.qty || 0} ${item.unit || 'Pcs.'}</td>
              <td style="text-align: right;">${Number(item.price || 0).toFixed(2)}</td>
              <td style="text-align: right;">${(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
            </tr>
          `).join('')}
          ${[...Array(Math.max(0, 5 - items.length))].map(() => `
            <tr style="height: 40px;">
              <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- TAX SUMMARY -->
      <div style="display: flex; border-top: 1px solid #000;">
        <div style="flex: 1;"></div>
        <div style="width: 300px;">
          <table style="width: 100%; font-size: 11px; border: none;">
            <tbody>
              <tr>
                <td style="padding: 4px; text-align: right; border: none;"></td>
                <td style="padding: 4px; text-align: right; border: none;"></td>
                <td style="padding: 4px; text-align: right; font-weight: bold; border: none;">${subtotal.toFixed(2)}</td>
              </tr>
              ${tax.type === 'INTRASTATE' || tax.type === 'INTERSTATE' ? `
                ${tax.cgstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : CGST</td><td style="padding: 4px; text-align: right; border: none;">@ ${tax.cgstRate} %</td><td style="padding: 4px; text-align: right; border: none;">${(tax.cgstAmount || 0).toFixed(2)}</td></tr>` : ''}
                ${tax.sgstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : SGST</td><td style="padding: 4px; text-align: right; border: none;">@ ${tax.sgstRate} %</td><td style="padding: 4px; text-align: right; border: none;">${(tax.sgstAmount || 0).toFixed(2)}</td></tr>` : ''}
                ${tax.igstRate > 0 ? `<tr><td style="padding: 4px; border: none;">Add : IGST</td><td style="padding: 4px; text-align: right; border: none;">@ ${tax.igstRate} %</td><td style="padding: 4px; text-align: right; border: none;">${(tax.igstAmount || 0).toFixed(2)}</td></tr>` : ''}
              ` : tax.type === 'INTERNATIONAL' ? `
                <tr><td style="padding: 4px; border: none;">Add : TAX</td><td style="padding: 4px; text-align: right; border: none;">@ ${tax.taxRate || 1} %</td><td style="padding: 4px; text-align: right; border: none;">${(tax.taxAmount || 0).toFixed(2)}</td></tr>
              ` : ''}
              ${Math.abs(Math.ceil(total) - total) > 0.01 ? `<tr><td style="padding: 4px; border: none;" colspan="2">Round Off</td><td style="padding: 4px; text-align: right; border: none;">+${(Math.ceil(total) - total).toFixed(2)}</td></tr>` : ''}
              <tr style="border-top: 1px solid #000; font-weight: bold;">
                <td style="padding: 4px; border: none;">Grand Total</td>
                <td style="padding: 4px; text-align: right; border: none;">${items.reduce((sum, it) => sum + Number(it.qty || 0), 0)} ${items[0]?.unit || 'Pcs.'}.</td>
                <td style="padding: 4px; text-align: right; border: none;">${Math.ceil(total).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAX BREAKDOWN TABLE -->
      <table style="margin-top: 10px; border: 1px solid #000;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th>Tax Rate</th>
            <th>Taxable Amt.</th>
            ${tax.type === 'INTRASTATE' ? '<th>CGST Amt.</th><th>SGST Amt.</th><th>IGST Amt.</th>' : ''}
            ${tax.type === 'INTERSTATE' ? '<th>IGST Amt.</th>' : ''}
            ${tax.type === 'INTERNATIONAL' ? '<th>TAX Amt.</th>' : ''}
            <th>Total Tax</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">
              ${tax.type === 'INTRASTATE' ? `${(tax.cgstRate || 0) + (tax.sgstRate || 0) + (tax.igstRate || 0)}%` : ''}
              ${tax.type === 'INTERSTATE' ? `${tax.igstRate || 0}%` : ''}
              ${tax.type === 'INTERNATIONAL' ? `${tax.taxRate || 1}%` : ''}
            </td>
            <td style="text-align: right;">${subtotal.toFixed(2)}</td>
            ${tax.type === 'INTRASTATE' ? `<td style="text-align: right;">${(tax.cgstAmount || 0).toFixed(2)}</td><td style="text-align: right;">${(tax.sgstAmount || 0).toFixed(2)}</td><td style="text-align: right;">${(tax.igstAmount || 0).toFixed(2)}</td>` : ''}
            ${tax.type === 'INTERSTATE' ? `<td style="text-align: right;">${(tax.igstAmount || 0).toFixed(2)}</td>` : ''}
            ${tax.type === 'INTERNATIONAL' ? `<td style="text-align: right;">${(tax.taxAmount || 0).toFixed(2)}</td>` : ''}
            <td style="text-align: right;">${(totals?.totalTaxAmt || 0).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

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
};

const OrderBulk = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [minOrderQty, setMinOrderQty] = useState(100); // Default from corporate settings
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchOrders = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const res = await fetch(`${API_BASE}/api/order?page=1&limit=100`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Handle both old format (array) and new paginated format (object with orders array)
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const response = await fetch(`${API_BASE}/api/corporate-settings`);
      if (response.ok) {
        const result = await response.json();
        const settings = result.data || result;
        setMinOrderQty(settings.minOrderQuantity || 100);
        console.log('✅ Loaded minimum order quantity from admin settings:', settings.minOrderQuantity);
      } else if (response.status === 404) {
        console.log('⚠️ Corporate settings API not available, using default (100)');
      }
    } catch (error) {
      console.log('⚠️ Could not load corporate settings, using default (100)');
    }
  };

  useEffect(() => {
    fetchOrders();
    loadSettings();
  }, []);

  const bulkOrders = useMemo(() => {
    console.log('📊 Filtering bulk orders from', orders.length, 'total orders');
    console.log('📊 Minimum order quantity threshold:', minOrderQty);
    
    const filtered = (orders ?? []).filter(order => {
      // ✅ Check if order contains B2B/Corporate products with quantity >= threshold
      const hasBulkCorporateProduct = (order.products ?? []).some(prod => {
        // Check if product is corporate/B2B
        const isCorporateProduct = prod?.isCorporate === true;
        
        if (!isCorporateProduct) {
          return false; // Skip non-corporate products
        }
        
        // Calculate total quantity for this corporate product
        const quantities = Object.values(prod?.quantity ?? {});
        const totalQty = quantities.reduce((sum, qty) => sum + Number(qty || 0), 0);
        
        console.log(`  Order ${order.orderId || order._id}: Product=${prod.products_name}, isCorporate=${isCorporateProduct}, Qty=${totalQty}, Threshold=${minOrderQty}`);
        
        return totalQty >= minOrderQty;
      });
      
      return hasBulkCorporateProduct;
    });
    
    console.log('✅ Found', filtered.length, 'bulk/corporate orders');
    return filtered;
  }, [orders, minOrderQty]);
  
  if (loading) return <div className="text-center p-4">Loading orders...</div>;

  const saveSettings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const response = await fetch(`${API_BASE}/api/corporate-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          minOrderQuantity: minOrderQty
        }),
      });
      
      if (response.ok) {
        alert('✅ Minimum order quantity saved successfully!');
        setShowSettings(false);
      } else if (response.status === 404) {
        alert('⚠️ Settings API not available. Settings will be used for this session only.');
        setShowSettings(false);
      } else {
        alert('❌ Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('⚠️ Settings API not available. Settings will be used for this session only.');
      setShowSettings(false);
    }
  };

  // ✅ View Invoice/Bill
  const viewInvoice = async (orderId) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
      const response = await fetch(`${API_BASE}/api/invoice/${orderId}`, {
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
      
      // Open invoice in new window with formatted display
      const invoiceWindow = window.open('', '_blank');
      if (!invoiceWindow) {
        setToast({ type: "error", msg: "Please allow popups to view invoice" });
        return;
      }

      // Format invoice HTML
      const invoiceHTML = generateInvoiceHTML(invoice, totals);
      invoiceWindow.document.write(invoiceHTML);
      invoiceWindow.document.close();

      setToast({ type: "success", msg: "Invoice opened in new window" });
    } catch (error) {
      setToast({ type: "error", msg: `Failed to fetch invoice: ${error.message}` });
    }
  };

  return (
    <div className="p-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg text-sm shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {toast.msg}
          <button
            onClick={() => setToast(null)}
            className="ml-3 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Bulk Orders Management</h2>
        <button
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-600">
          Minimum order quantity: ≥ {minOrderQty} units (configured in admin settings)
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Showing {bulkOrders.length} bulk orders out of {orders.length} total orders
        </p>
      </div>

      {bulkOrders.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">No Bulk Orders Found</p>
          <p className="text-sm text-gray-600 mb-4">
            No orders meet the minimum quantity threshold of ≥ {minOrderQty} units per product
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Total orders in system: {orders.length}
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Adjust Minimum Quantity
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bulkOrders.map((order) => {
            const first = order?.products?.[0] || {};
            return (
              <div
                key={order._id}
                className="bg-white rounded-lg p-4 shadow flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: Basic info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500 truncate">#{order._id}</span>
                  </div>

                  <p className="font-semibold text-sm sm:text-base truncate">
                    {first.products_name || "Unnamed product"}
                  </p>

                  <p className="text-xs text-gray-600">
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                  <p className="text-xs text-gray-700 mt-1">
                    {order?.address?.fullName
                      ? `${order.address.fullName} • ${order.address.city || ""}`
                      : "No address"}
                  </p>

                  {/* Order Type and Quantity Info */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      🏢 B2B Order
                    </span>
                    <span className="text-xs text-gray-600">
                      Corporate Products Qty: {(order.products ?? [])
                        .filter(prod => prod?.isCorporate === true)
                        .reduce((total, prod) => 
                          total + Object.values(prod?.quantity ?? {}).reduce((sum, qty) => sum + Number(qty), 0), 0
                        )}
                    </span>
                  </div>
                </div>

                {/* Right: Price + Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <p className="font-semibold text-right">
                    ₹{Number(order.price || 0).toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedOrderId(order._id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50"
                    >
                      View
                    </button>
                    <button
                      onClick={() => viewInvoice(order._id)}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700"
                      title="View Invoice/Bill"
                    >
                      🧾 Invoice
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Order Details */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedOrderId(null)}
          />
          <div className="relative w-full sm:max-w-3xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Order Details</h3>
              <button
                className="text-sm px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => setSelectedOrderId(null)}
              >
                Close
              </button>
            </div>
            <div className="p-4">
              <OrderDetailsCard orderId={selectedOrderId} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Bulk Order Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Quantity
                </label>
                <input
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Orders with quantities equal or above this will be considered bulk orders
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  💡 This setting is synced with the Corporate Settings page
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBulk;