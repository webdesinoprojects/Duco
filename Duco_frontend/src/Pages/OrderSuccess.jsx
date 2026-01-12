import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceByOrder } from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext";
import { usePriceContext } from "../ContextAPI/PriceContext";
import { InvoiceTemplate } from "../Components/InvoiceTemplate";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
};

// Helper to safely convert to number
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Format currency based on type
const formatCurrency = (amount, symbol, isINR = true) => {
  const num = safeNum(amount);
  if (isINR) {
    return `${symbol}${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  } else {
    return `${symbol}${num.toFixed(2)}`;
  }
};

// Use the new InvoiceTemplate component
const InvoiceDucoTailwind = InvoiceTemplate;

/* ------------------------------ ORDER SUCCESS ------------------------------ */
export default function OrderSuccess() {
  const { orderId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceData, setInvoiceData] = useState(null);
  const { clearCart } = useCart();
  const { currency, toConvert } = usePriceContext();
  const invoiceRef = useRef();

  const orderId = paramId || localStorage.getItem("lastOrderId");
  const storedMeta = JSON.parse(localStorage.getItem("lastOrderMeta") || "{}");

  const paymentMeta =
    location.state?.paymentMeta ||
    storedMeta ||
    {};
  const paymentMethod =
    paymentMeta.mode === "store_pickup"
      ? "Pay on Store (Pickup)"
      : paymentMeta.mode === "netbanking"
      ? "Netbanking / UPI"
      : paymentMeta.mode === "50%"
      ? "50% Advance Payment"
      : "Pay Online";
  const isB2B = paymentMeta?.isCorporate || false;

  // ✅ Get currency symbol
  const currencySymbol = currencySymbols[currency] || "₹";
  const isINR = currency === 'INR' || !currency;
  
  // ✅ Get payment currency and location from state or stored meta
  const paymentCurrency = location.state?.paymentCurrency || storedMeta?.paymentCurrency || currency || 'INR';
  const customerCountry = location.state?.customerCountry || storedMeta?.customerCountry || 'India';
  const customerCity = location.state?.customerCity || storedMeta?.customerCity || '';
  const customerState = location.state?.customerState || storedMeta?.customerState || '';

  console.log("💳 Payment Mode:", paymentMethod);
  console.log("🏢 Order Type:", isB2B ? "B2B" : "B2C");
  console.log("💱 Currency:", currency, "Symbol:", currencySymbol, "IsINR:", isINR);
  console.log("🌍 Payment Location:", { paymentCurrency, customerCountry, customerCity, customerState });

  /* ✅ FIXED INVOICE LOGIC: accurate charges + gst like cart + side printing info */
  useEffect(() => {
    let isMounted = true;
    
    async function fetchInvoice() {
      try {
        if (!orderId) throw new Error("No Order ID found");

        const res = await getInvoiceByOrder(orderId);
        
        if (!isMounted) return; // Prevent state update if unmounted
        
        const inv = res?.invoice;
        if (!inv) throw new Error("No invoice found");

        const items = inv.items?.map((it, i) => ({
          ...it,
          sno: i + 1,
          printSides: it.printSides || it.sides || 0,
        })) || [];

        // ✅ Calculate subtotal from items
        const subtotal = items.reduce(
          (sum, item) => sum + safeNum(item.qty, 0) * safeNum(item.price, 0),
          0
        );

        // ✅ Extract charges from invoice with proper fallbacks
        let pf = safeNum(inv.charges?.pf ?? inv.pfCharges ?? inv.order?.pf ?? 0);
        let printing = safeNum(inv.charges?.printing ?? inv.printingCharges ?? inv.order?.printing ?? 0);
        
        console.log('💰 Invoice Charges Debug:', {
          invCharges: inv.charges,
          pf,
          printing,
          orderPf: inv.order?.pf,
          orderPrinting: inv.order?.printing,
        });

        // ✅ CRITICAL FIX: Use backend total directly instead of recalculating
        // The backend has already calculated the correct total with proper tax logic
        const total = safeNum(inv.total ?? inv.totalPay ?? 0);
        
        // ✅ Extract tax information from backend (already calculated correctly)
        const taxInfo = inv.tax || {};
        const cgstAmount = safeNum(taxInfo.cgstAmount ?? 0);
        const sgstAmount = safeNum(taxInfo.sgstAmount ?? 0);
        const igstAmount = safeNum(taxInfo.igstAmount ?? 0);
        const taxAmount = safeNum(taxInfo.taxAmount ?? 0);
        
        // ✅ Calculate total tax based on type
        let totalTax = 0;
        if (taxInfo.type === 'INTERNATIONAL') {
          totalTax = taxAmount;
        } else if (taxInfo.type === 'INTRASTATE_CGST_SGST') {
          totalTax = cgstAmount + sgstAmount;
        } else if (taxInfo.type === 'INTERSTATE') {
          totalTax = igstAmount;
        } else if (taxInfo.type === 'B2C_NO_TAX') {
          totalTax = 0;
        } else {
          totalTax = cgstAmount + sgstAmount + igstAmount + taxAmount;
        }

        // ✅ Calculate taxable amount (subtotal + charges)
        const taxableAmount = subtotal + pf + printing;

        const formatted = {
          ...inv,
          items,
          charges: { pf, printing },
          tax: taxInfo,
          subtotal: safeNum(subtotal),
          taxableAmount: safeNum(taxableAmount),
          totalTax: safeNum(totalTax),
          total: safeNum(total),
          currency: currency || 'INR',
          currencySymbol: currencySymbol,
          conversionRate: safeNum(inv.conversionRate ?? toConvert ?? 1),
          paymentmode: inv.paymentmode || paymentMeta.mode || 'online',
          amountPaid: safeNum(inv.amountPaid ?? 0),
          paymentCurrency: inv.paymentCurrency || paymentCurrency,
          customerCountry: inv.customerCountry || customerCountry,
          customerCity: inv.customerCity || customerCity,
          customerState: inv.customerState || customerState,
        };

        console.log("🧾 Normalized Invoice for Success Page:", {
          subtotal: formatted.subtotal,
          pf: formatted.charges.pf,
          printing: formatted.charges.printing,
          taxableAmount: formatted.taxableAmount,
          totalTax: formatted.totalTax,
          total: formatted.total,
          taxType: formatted.tax?.type,
        });
        
        if (isMounted) {
          setInvoiceData(formatted);
          clearCart();
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        if (isMounted) {
          navigate("/");
        }
      }
    }
    
    fetchInvoice();
    
    return () => {
      isMounted = false;
    };
  }, [orderId]); // Only depend on orderId

  // ✅ PDF DOWNLOAD
  const downloadPDF = async () => {
    const input = invoiceRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const marginX = (pageWidth - imgWidth) / 2;

    pdf.addImage(imgData, "PNG", marginX, 10, imgWidth, imgHeight);
    pdf.save(`Invoice_${orderId}.pdf`);
  };

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading your order…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      {/* SUCCESS MESSAGE SECTION */}
      <div className="mx-auto max-w-5xl mb-8">
        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-green-500">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✅</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Thank you for your order!
              </h1>
              <p className="text-gray-600 mb-4">
                Your order <span className="font-semibold text-lg text-gray-800">#{orderId}</span> has been placed successfully.
              </p>
              <p className="text-sm text-gray-500">
                A confirmation email and invoice have been sent to your registered email address.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ORDER DETAILS SECTION */}
      <div className="mx-auto max-w-5xl mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - Order Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Order Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-semibold text-gray-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order Type:</span>
                <span className="font-semibold text-gray-800">{isB2B ? "Corporate (B2B)" : "Retail (B2C)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Currency:</span>
                <span className="font-semibold text-gray-800">{paymentCurrency}</span>
              </div>
              {customerCountry && customerCountry !== 'India' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment From:</span>
                  <span className="font-semibold text-gray-800">
                    {customerCity && customerState ? `${customerCity}, ${customerState}, ${customerCountry}` : customerCountry}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Charges Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Charges Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(invoiceData.subtotal, currencySymbol, isINR)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">P&F Charges:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(invoiceData.charges.pf, currencySymbol, isINR)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Printing Charges:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(invoiceData.charges.printing, currencySymbol, isINR)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(invoiceData.taxableAmount, currencySymbol, isINR)}
                </span>
              </div>
              
              {/* Tax Breakdown */}
              {invoiceData.tax && (
                <>
                  {invoiceData.tax.type === 'B2C_NO_TAX' ? (
                    <div className="flex justify-between text-green-600">
                      <span className="text-sm">Tax (B2C):</span>
                      <span className="font-semibold">No Tax</span>
                    </div>
                  ) : invoiceData.tax.type === 'INTERNATIONAL' ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">TAX (1%):</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(invoiceData.tax.taxAmount || 0, currencySymbol, isINR)}
                      </span>
                    </div>
                  ) : invoiceData.tax.type === 'INTRASTATE_CGST_SGST' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">CGST (2.5%):</span>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(invoiceData.tax.cgstAmount || 0, currencySymbol, isINR)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">SGST (2.5%):</span>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(invoiceData.tax.sgstAmount || 0, currencySymbol, isINR)}
                        </span>
                      </div>
                    </>
                  ) : invoiceData.tax.type === 'INTERSTATE' ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">IGST (5%):</span>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(invoiceData.tax.igstAmount || 0, currencySymbol, isINR)}
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GRAND TOTAL SECTION */}
      <div className="mx-auto max-w-5xl mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-100 text-sm mb-1">Grand Total</p>
              <h3 className="text-4xl font-bold">
                {formatCurrency(invoiceData.total, currencySymbol, isINR)}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm mb-1">Order ID</p>
              <p className="text-2xl font-semibold">#{orderId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS SECTION */}
      <div className="mx-auto max-w-5xl mb-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={downloadPDF}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8l-6-4m6 4l6-4" />
            </svg>
            Download Invoice (PDF)
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors shadow-md"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 11l4-4m0 0l4 4m-4-4v4" />
            </svg>
            Continue Shopping
          </button>
        </div>
      </div>

      {/* INVOICE SECTION */}
      <div className="mx-auto max-w-5xl">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">📄 Invoice</h2>
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
          <div ref={invoiceRef} className="p-6 overflow-auto max-h-[80vh]">
            <InvoiceDucoTailwind data={invoiceData} />
          </div>
        </div>
      </div>
    </div>
  );
}
