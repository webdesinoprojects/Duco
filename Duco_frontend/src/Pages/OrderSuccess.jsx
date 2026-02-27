import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceByOrder, uploadInvoicePdf, getOrderById } from "../Service/APIservice";
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
  // ✅ Fix: Show 2 decimal places for all currencies to ensure math adds up
  // Prevents confusion like ₹8 + ₹0 = ₹9 
  const formatted = num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${symbol}${formatted}`;
};

// Use the new InvoiceTemplate component
const InvoiceDucoTailwind = InvoiceTemplate;

/* ------------------------------ ORDER SUCCESS ------------------------------ */
export default function OrderSuccess() {
  const { orderId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceData, setInvoiceData] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [orderInfoError, setOrderInfoError] = useState(null);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const { clearCart } = useCart();
  const { currency, toConvert } = usePriceContext();
  const invoiceRef = useRef();
  const hasUploadedInvoiceRef = useRef(false);
  const [emailStatusOverride, setEmailStatusOverride] = useState(null);
  const [emailErrorOverride, setEmailErrorOverride] = useState(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);

  const orderId = paramId || localStorage.getItem("lastOrderId");
  const storedMeta = JSON.parse(localStorage.getItem("lastOrderMeta") || "{}");

  const paymentMeta =
    location.state?.paymentMeta ||
    storedMeta ||
    {};
  const notificationMeta =
    location.state?.notifications ||
    storedMeta?.notifications ||
    null;
  const emailSent = emailStatusOverride
    ? emailStatusOverride === "sent"
    : notificationMeta?.emailSent === true;
  const emailStatus = emailStatusOverride || (notificationMeta
    ? (emailSent ? "sent" : "failed")
    : "unknown");
  const emailErrorMessage = emailErrorOverride ?? notificationMeta?.emailError;
  const paymentMethod =
    paymentMeta.mode === "store_pickup"
      ? "Pay on Store (Pickup)"
      : paymentMeta.mode === "netbanking"
      ? "Netbanking / UPI"
      : paymentMeta.mode === "50%"
      ? "50% Advance Payment"
      : "Pay Online";

  const emailToDisplay = useMemo(() => {
    const invoiceEmail =
      invoiceData?.billTo?.email ||
      invoiceData?.shipTo?.email ||
      invoiceData?.order?.addresses?.billing?.email ||
      invoiceData?.order?.address?.email ||
      invoiceData?.order?.email;

    if (invoiceEmail) return invoiceEmail;

    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return storedUser?.email || storedUser?.user?.email || "";
    } catch {
      return "";
    }
  }, [invoiceData]);


  // ✅ Determine B2B from order data (more reliable than paymentMeta)
  // Check if order has B2B indicators: GST number, bulk quantity, order type, etc.
  const isB2B = useMemo(() => {
    if (!invoiceData) return paymentMeta?.isCorporate || false;
    
    // ✅ Check multiple indicators for B2B
    const hasGST = !!(invoiceData.billTo?.gstin || invoiceData.order?.addresses?.billing?.gstNumber);
    const isBulkQuantity = invoiceData.items?.some(item => {
      const qty = safeNum(item.qty, 0);
      return qty >= 50; // Bulk threshold
    });
    const isB2BOrderType = invoiceData.order?.orderType === 'B2B';
    const isInternationalTax = invoiceData.tax?.type === 'INTERNATIONAL';
    const hasInterstateTax = invoiceData.tax?.type === 'INTERSTATE' || invoiceData.tax?.type === 'INTRASTATE_CGST_SGST';
    
    console.log('🔍 B2B Detection:', {
      hasGST,
      isBulkQuantity,
      isB2BOrderType,
      isInternationalTax,
      hasInterstateTax,
      paymentMetaIsCorporate: paymentMeta?.isCorporate,
      orderType: invoiceData.order?.orderType,
    });
    
    // B2B if: has GST OR bulk quantity OR B2B order type OR has tax (not B2C_NO_TAX)
    return hasGST || isBulkQuantity || isB2BOrderType || hasInterstateTax || isInternationalTax || paymentMeta?.isCorporate;
  }, [invoiceData, paymentMeta]);

  // ✅ Get currency and conversion info from state or stored meta
  const paymentCurrency = location.state?.paymentCurrency || storedMeta?.paymentCurrency || currency || 'INR';
  const conversionRate = location.state?.conversionRate || storedMeta?.conversionRate || toConvert || 1;
  const currencySymbol = currencySymbols[paymentCurrency] || "₹";
  const isINR = paymentCurrency === 'INR' || !paymentCurrency;
  
  // ✅ Get payment location from state or stored meta
  const customerCountry = location.state?.customerCountry || storedMeta?.customerCountry || 'India';
  const customerCity = location.state?.customerCity || storedMeta?.customerCity || '';
  const customerState = location.state?.customerState || storedMeta?.customerState || '';

  console.log("💳 Payment Mode:", paymentMethod);
  console.log("🏢 Order Type:", isB2B ? "B2B" : "B2C");
  console.log("💱 Currency:", paymentCurrency, "Symbol:", currencySymbol, "IsINR:", isINR, "ConversionRate:", conversionRate);
  console.log("🌍 Payment Location:", { paymentCurrency, customerCountry, customerCity, customerState });

  /* ✅ SIMPLIFIED INVOICE LOGIC: Keep INR working, simplify non-INR */
  useEffect(() => {
    let isMounted = true;
    
    async function fetchOrderData() {
          try {
            if (!orderId) throw new Error("No Order ID found");

            // ✅ Fetch ORDER (not invoice) to get stored values
            console.log('📦 Fetching order data for:', orderId);
            const orderRes = await getOrderById(orderId);
            const order = orderRes?.order || orderRes;

            if (!isMounted) return;
            if (!order) throw new Error("No order found");

            console.log('📦 Order data received:', {
              orderId: order._id,
              currency: order.currency,
              displayPrice: order.displayPrice,
              price: order.price,
              conversionRate: order.conversionRate,
              // ✅ Log breakdown values
              subtotal: order.subtotal,
              subtotalAfterDiscount: order.subtotalAfterDiscount,
              taxableAmount: order.taxableAmount,
              pf: order.pf,
              printing: order.printing,
              gst: order.gst,
              discount: order.discount
            });

            // ✅ Use stored values from order (NO RECALCULATION - JUST DISPLAY)
            const displayCurrency = order.currency || order.paymentCurrency || paymentCurrency || 'INR';
            const displayTotal = order.displayPrice || order.price || 0;
            const symbol = currencySymbols[displayCurrency] || '₹';

            // ✅ Extract stored values from order (NO MATH - JUST READ)
            const subtotal = order.subtotal || 0;
            const discount = order.discount || null;
            const discountAmount = discount?.amount || 0;
            const pf = order.pf || 0;
            const printing = order.printing || 0;
            const gst = order.gst || 0;
            
            // ✅ Use stored calculated values (NO RECALCULATION - BACKEND DID THE MATH)
            // If not stored (old orders), calculate as fallback
            let subtotalAfterDiscount = order.subtotalAfterDiscount;
            let taxableAmount = order.taxableAmount;
            let calculatedSubtotal = subtotal;
            
            // ✅ FALLBACK for old orders: Calculate from items if subtotal is 0
            if (subtotal === 0 && order.products && order.products.length > 0) {
              calculatedSubtotal = order.products.reduce((sum, product) => {
                const qty = typeof product.quantity === 'object' 
                  ? Object.values(product.quantity).reduce((s, q) => s + Number(q || 0), 0)
                  : Number(product.quantity || 0);
                const price = Number(product.price || 0);
                return sum + (qty * price);
              }, 0);
              console.log('⚠️ Using fallback subtotal calculation for old order:', calculatedSubtotal);
            }
            
            // Calculate derived values if not stored
            if (!subtotalAfterDiscount) {
              subtotalAfterDiscount = calculatedSubtotal - discountAmount;
            }
            if (!taxableAmount) {
              taxableAmount = subtotalAfterDiscount + pf + printing;
            }

            // ✅ Format order data for display (NO CONVERSION, NO MATH)
            const formatted = {
              order: order,
              // ✅ Transform products into invoice items format
              items: (order.products || []).map(product => {
                // Calculate total quantity from quantity object
                const qty = typeof product.quantity === 'object' 
                  ? Object.values(product.quantity).reduce((sum, q) => sum + Number(q || 0), 0)
                  : Number(product.quantity || 0);
                
                return {
                  description: product.products_name || product.name || 'Product',
                  barcode: product._id || '',
                  hsn: '7307',
                  qty: qty,
                  unit: 'Pcs.',
                  price: Number(product.price || 0),
                };
              }),
              charges: { 
                pf: pf, 
                printing: printing 
              },
              discount: discount,
              subtotal: calculatedSubtotal,
              subtotalAfterDiscount: subtotalAfterDiscount,
              taxableAmount: taxableAmount,
              totalTax: gst,
              total: displayTotal,
              currency: displayCurrency,
              currencySymbol: symbol,
              conversionRate: order.conversionRate || 1,
              paymentmode: order.paymentmode || paymentMeta.mode || 'online',
              amountPaid: order.advancePaidAmount || 0,
              paymentCurrency: displayCurrency,
              customerCountry: order.customerCountry || customerCountry,
              customerCity: order.customerCity || customerCity,
              customerState: order.customerState || customerState,
              // Tax info (simplified - just show total)
              tax: {
                type: order.taxType || (order.orderType === 'B2B' ? 'B2B' : 'B2C'),
                taxAmount: order.taxType === 'INTERNATIONAL' ? gst : 0,
                cgstAmount: order.cgst || 0,
                sgstAmount: order.sgst || 0,
                igstAmount: order.igst || 0,
              },
              // Billing/shipping addresses
              billTo: order.addresses?.billing || order.address,
              shipTo: order.addresses?.shipping || order.address,
              // Company info for invoice template
              company: {
                name: "DUCO ART PRIVATE LIMITED",
                gstin: "22AAHCD0277E1ZN",
                cin: "U52601CT2020PTC010997",
                address: "SADIJA COMPOUND AVANTI VIHAR LIG 64",
                city: "RAIPUR",
                state: "CHHATTISGARH",
                pincode: "492001",
                phone: "+91 9876543210",
                email: "info@ducoart.com"
              },
              // Invoice info
              invoice: {
                number: order._id || order.orderId,
                date: new Date(order.createdAt).toLocaleDateString('en-IN'),
                placeOfSupply: order.addresses?.billing?.state || order.address?.state || 'Chhattisgarh',
              },
            };

            console.log("🧾 Order Data for Success Page (NO RECALCULATION):", {
              subtotal: formatted.subtotal,
              discount: formatted.discount?.amount,
              subtotalAfterDiscount: formatted.subtotalAfterDiscount,
              pf: formatted.charges.pf,
              printing: formatted.charges.printing,
              taxableAmount: formatted.taxableAmount,
              totalTax: formatted.totalTax,
              total: formatted.total,
              currency: formatted.currency,
              source: 'ORDER (not invoice)',
              // ✅ Log items to verify they have qty and price
              itemsCount: formatted.items.length,
              firstItem: formatted.items[0],
            });

            // ✅ Add formatCurrency function for PDF rendering
            const formatCurrencyForPDF = (num) => {
              const n = Number(num) || 0;
              return `${symbol}${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
            };

            if (isMounted) {
              setInvoiceData({
                ...formatted,
                formatCurrency: formatCurrencyForPDF,
              });
              // ✅ Clear cart only once when invoice data is set
              if (!invoiceData) {
                clearCart();
              }
            }
          } catch (err) {
            console.error("Error fetching order:", err);
            if (isMounted) {
              navigate("/");
            }
          }
        }

    
    fetchOrderData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, paymentCurrency, currencySymbol, customerCountry, customerCity, customerState]);

  useEffect(() => {
    if (!orderId) return;
    let mounted = true;
    const loadOrderInfo = async () => {
      try {
        const data = await getOrderById(orderId);
        if (mounted) {
          setOrderInfo(data);
          setOrderInfoError(null);
        }
      } catch (err) {
        if (mounted) {
          setOrderInfo(null);
          setOrderInfoError(err?.response?.data?.message || err.message || "Failed to load order");
        }
      }
    };
    loadOrderInfo();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const generateInvoicePdf = async () => {
    const input = invoiceRef.current;
    if (!input) throw new Error("Invoice not ready");
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;
    const marginY = 10;
    const imgWidth = pageWidth - 2 * marginX;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Multi-page support: split across pages if content is longer than one page
    const pageContentHeight = pageHeight - 2 * marginY;
    let heightLeft = imgHeight;
    let position = marginY;
    
    // Add first page
    pdf.addImage(imgData, "PNG", marginX, position, imgWidth, imgHeight);
    heightLeft -= pageContentHeight;
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + marginY;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", marginX, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;
    }
    
    return pdf;
  };

  // ✅ PDF DOWNLOAD
  const downloadPDF = async () => {
    const pdf = await generateInvoicePdf();
    pdf.save(`Invoice_${orderId}.pdf`);
  };

  const uploadInvoiceForEmail = async () => {
    if (!orderId || isUploadingInvoice) return;
    setIsUploadingInvoice(true);
    try {
      const pdf = await generateInvoicePdf();
      const pdfBlob = pdf.output("blob");
      const result = await uploadInvoicePdf(orderId, pdfBlob);
      const sent = result?.emailSent === true;
      setEmailStatusOverride(sent ? "sent" : "failed");
      setEmailErrorOverride(sent ? null : (result?.emailError || result?.message || "Email failed"));
    } catch (err) {
      setEmailStatusOverride("failed");
      setEmailErrorOverride(err?.response?.data?.message || err.message || "Upload failed");
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  useEffect(() => {
    if (!invoiceData || !orderId || hasUploadedInvoiceRef.current) return;
    hasUploadedInvoiceRef.current = true;
    
    // Show popup immediately
    setShowEmailPopup(true);
    
    // Upload invoice in background
    const timer = setTimeout(() => {
      uploadInvoiceForEmail();
    }, 500);
    return () => clearTimeout(timer);
  }, [invoiceData, orderId]);

  if (!invoiceData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 z-50">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-2 bg-white rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Your Order</h2>
          <p className="text-gray-600 text-sm">Please wait while we prepare your invoice...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      {showEmailPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📧</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Email Confirmation
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  An email with your invoice will be sent to
                  <span className="font-semibold text-gray-900">
                    {emailToDisplay ? ` ${emailToDisplay}` : " your registered email address"}
                  </span>
                  {" "}shortly.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowEmailPopup(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SUCCESS MESSAGE SECTION */}
      <div className="mx-auto max-w-5xl mb-8">
        <div className="bg-white rounded-lg shadow-md p-8 border-l-4 border-green-500">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✅</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Thank you for your order!
              </h1>
              <p className="text-gray-600">
                Your order <span className="font-semibold text-lg text-gray-800">#{orderId}</span> has been placed successfully.
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
                <span className="font-semibold text-gray-800">{isB2B ? "Bulk Order" : "Retail Order"}</span>
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
              
              {/* Corporate Discount Display */}
              {invoiceData.discount && invoiceData.discount.amount > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Corporate Discount ({invoiceData.discount.percent || invoiceData.discount.discountPercentage}%):</span>
                    <span className="text-sm font-semibold">
                      - {formatCurrency(invoiceData.discount.amount, currencySymbol, isINR)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-2 mb-2">
                    <span className="text-xs text-gray-500">Subtotal after discount:</span>
                    <span className="font-semibold text-sm text-gray-700">
                      {formatCurrency(invoiceData.subtotalAfterDiscount || (invoiceData.subtotal - invoiceData.discount.amount), currencySymbol, isINR)}
                    </span>
                  </div>
                </>
              )}
              
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
                <span className="text-gray-600">{isB2B ? 'Taxable Amount:' : 'Subtotal:'}</span>
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
                      <span className="font-semibold"></span>
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
