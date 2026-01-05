import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import CartItem from "../Components/CartItem.jsx";
import AddressManagerEnhanced from "../Components/AddressManagerEnhanced";
import Loading from "../Components/Loading";
import { CartContext } from "../ContextAPI/CartContext";
import { getproducts, getChargePlanRates, getChargePlanTotals } from "../Service/APIservice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { usePriceContext } from "../ContextAPI/PriceContext.jsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JsBarcode from "jsbarcode";

const currencySymbols = {
  INR: "₹", // Indian Rupee
  USD: "$", // US Dollar
  AED: "د.إ", // UAE Dirham
  EUR: "€", // Euro
  GBP: "£", // British Pound
  AUD: "A$", // Australian Dollar 🇦🇺
  CAD: "C$", // Canadian Dollar 🇨🇦
  SGD: "S$", // Singapore Dollar 🇸🇬
  NZD: "NZ$", // New Zealand Dollar 🇳🇿
  CHF: "CHF", // Swiss Franc 🇨🇭
  JPY: "¥", // Japanese Yen 🇯🇵
  CNY: "¥", // Chinese Yuan 🇨🇳
  HKD: "HK$", // Hong Kong Dollar 🇭🇰
  MYR: "RM", // Malaysian Ringgit 🇲🇾
  THB: "฿", // Thai Baht 🇹🇭
  SAR: "﷼", // Saudi Riyal 🇸🇦
  QAR: "ر.ق", // Qatari Riyal 🇶🇦
  KWD: "KD", // Kuwaiti Dinar 🇰🇼
  BHD: "BD", // Bahraini Dinar 🇧🇭
  OMR: "﷼", // Omani Rial 🇴🇲
  ZAR: "R", // South African Rand 🇿🇦
  PKR: "₨", // Pakistani Rupee 🇵🇰
  LKR: "Rs", // Sri Lankan Rupee 🇱🇰
  BDT: "৳", // Bangladeshi Taka 🇧🇩
  NPR: "रू", // Nepalese Rupee 🇳🇵
  PHP: "₱", // Philippine Peso 🇵🇭
  IDR: "Rp", // Indonesian Rupiah 🇮🇩
  KRW: "₩", // South Korean Won 🇰🇷
};

/* ----------------- Helpers ----------------- */
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ✅ Apply location-based pricing to a base price
const applyLocationPricing = (basePrice, priceIncrease, conversionRate) => {
  let price = safeNum(basePrice);
  
  // Step 1: Apply percentage increase (location markup)
  if (priceIncrease) {
    price += (price * safeNum(priceIncrease)) / 100;
  }
  
  // Step 2: Apply currency conversion
  if (conversionRate && conversionRate !== 1) {
    price *= conversionRate;
  }
  
  // ✅ Don't round here - keep precision for calculations
  return price;
};

// ✅ Count printed sides
const countDesignSides = (item) => {
  const d = item?.design || {};
  const sides = ["front", "back", "left", "right"];
  let used = 0;
  sides.forEach((s) => {
    const side = d[s] || {};
    // Count sides with either uploaded image OR custom text
    if (side?.uploadedImage || side?.customText) used += 1;
  });
  return used;
};

// ✅ Pick slab from plan
const pickSlab = (plan, qty) => {
  const slabs = plan?.slabs || [];
  return (
    slabs.find((s) => qty >= s.min && qty <= s.max) ||
    slabs[slabs.length - 1] || { printingPerSide: 0, pnfPerUnit: 0, pnfFlat: 0 }
  );
};

/* ----------------- Invoice UI ----------------- */
const InvoiceDucoTailwind = ({ data }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && data?.invoice?.number) {
      JsBarcode(barcodeRef.current, data.invoice.number, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
      });
    }
  }, [data?.invoice?.number]);

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#000",
        backgroundColor: "#fff",
        padding: "20px",
        width: "800px",
        margin: "0 auto",
        border: "1px solid #ccc",
      }}
    >
      <h1 style={{ textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>
        Tax Invoice
      </h1>

      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "4px" }}>
          {data.company.name}
        </h2>
        <p>{data.company.address}</p>
        <p>GSTIN: {data.company.gstin}</p>
        <p>Email: {data.company.email}</p>
      </div>

      <svg ref={barcodeRef}></svg>
      <hr style={{ margin: "15px 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p>
            Invoice No: <b>{data.invoice.number}</b>
          </p>
          <p>Date: {data.invoice.date}</p>
          <p>Place of Supply: {data.invoice.placeOfSupply}</p>
        </div>
        <div>
          <p>Copy Type: {data.invoice.copyType}</p>
        </div>
      </div>

      <hr style={{ margin: "15px 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <h3>Billed to :</h3>
          <p>{data.billTo.name}</p>
          <p>{data.billTo.address}</p>
          <p>{data.billTo.phone}</p>
          {data.billTo.gstNumber && (
            <p><strong>GST/Tax Number:</strong> {data.billTo.gstNumber}</p>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Shipped to :</h3>
          <p>{data.shipTo?.name || data.billTo.name}</p>
          <p>{data.shipTo?.address || data.billTo.address}</p>
          <p>{data.shipTo?.phone || data.billTo.phone}</p>
        </div>
      </div>

      <hr style={{ margin: "15px 0" }} />
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000", background: "#f2f2f2" }}>
            <th style={{ textAlign: "left", padding: "6px" }}>S.No</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Description</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Qty</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Unit</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it) => (
            <tr key={it.sno} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "6px" }}>{it.sno}</td>
              <td style={{ padding: "6px" }}>{it.description}</td>
              <td style={{ padding: "6px" }}>{it.qty}</td>
              <td style={{ padding: "6px" }}>{it.unit}</td>
              <td style={{ padding: "6px" }}>
                {data.formatCurrency(it.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Tax Summary Table */}
      <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ width: "400px", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ textAlign: "left", padding: "6px", width: "40%" }}>Description</th>
              <th style={{ textAlign: "center", padding: "6px", width: "30%" }}>Total Tax</th>
              <th style={{ textAlign: "right", padding: "6px", width: "30%" }}>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "6px" }}>Subtotal</td>
              <td style={{ textAlign: "center", padding: "6px" }}>-</td>
              <td style={{ textAlign: "right", padding: "6px" }}>{data.formatCurrency(data.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>P&F Charges</td>
              <td style={{ textAlign: "center", padding: "6px" }}>-</td>
              <td style={{ textAlign: "right", padding: "6px" }}>{data.formatCurrency(data.pfCost || 0)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>Printing Charges</td>
              <td style={{ textAlign: "center", padding: "6px" }}>-</td>
              <td style={{ textAlign: "right", padding: "6px" }}>{data.formatCurrency(data.printingCost || 0)}</td>
            </tr>
            
            {data.locationTax?.percentage > 0 && (
              <tr>
                <td style={{ padding: "6px" }}>Location Adjustment ({data.locationTax.country})</td>
                <td style={{ textAlign: "center", padding: "6px" }}>
                  {data.formatCurrency((data.subtotal + (data.printingCost || 0) + (data.pfCost || 0)) * (data.locationTax.percentage / 100))}
                </td>
                <td style={{ textAlign: "right", padding: "6px" }}>
                  {data.formatCurrency((data.subtotal + (data.printingCost || 0) + (data.pfCost || 0)) * (data.locationTax.percentage / 100))}
                </td>
              </tr>
            )}

            {/* ✅ GST Breakdown */}
            {(() => {
              const gstRate = data.gstPercent || 5;
              const taxableAmount = data.subtotal + (data.printingCost || 0) + (data.pfCost || 0);
              const totalGstAmount = (taxableAmount * gstRate) / 100;
              const cgstAmount = totalGstAmount / 2;
              const sgstAmount = totalGstAmount / 2;
              
              return (
                <>
                  <tr>
                    <td style={{ padding: "6px" }}>Add: CGST</td>
                    <td style={{ textAlign: "center", padding: "6px" }}>
                      {data.formatCurrency(cgstAmount)}
                    </td>
                    <td style={{ textAlign: "right", padding: "6px" }}>
                      {data.formatCurrency(taxableAmount + cgstAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "6px" }}>Add: SGST</td>
                    <td style={{ textAlign: "center", padding: "6px" }}>
                      {data.formatCurrency(sgstAmount)}
                    </td>
                    <td style={{ textAlign: "right", padding: "6px" }}>
                      {data.formatCurrency(taxableAmount + cgstAmount + sgstAmount)}
                    </td>
                  </tr>
                </>
              );
            })()}

            <tr style={{ borderTop: "2px solid #000", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
              <td style={{ padding: "8px" }}>Grand Total</td>
              <td style={{ textAlign: "center", padding: "8px" }}>
                {data.items.reduce((sum, it) => sum + it.qty, 0)} {data.items[0]?.unit || "Pcs"}
              </td>
              <td style={{ textAlign: "right", padding: "8px" }}>{data.formatCurrency(data.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ----------------- Main Cart ----------------- */
const Cart = () => {
  const { cart, setCart, removeFromCart, updateQuantity } =
    useContext(CartContext);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);
  const [billingAddress, setBillingAddress] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(null);

  const navigate = useNavigate();
  const invoiceRef = useRef();

  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [conversionRate, setConversionRate] = useState(1);
  const [minOrderQty, setMinOrderQty] = useState(100); // Default minimum order quantity
  const [gstNumber, setGstNumber] = useState(""); // Optional GST/Tax code

  // ✅ Dynamic Currency Formatter (prices are already location-adjusted at item level)
  const formatCurrency = (num) => {
    const value = safeNum(num, 0);
    const isINR = currencySymbol === '₹' || !currencySymbol;
    
    let formatted;
    if (isINR) {
      // INR: Round to whole numbers (₹10, ₹100)
      formatted = `${currencySymbol}${Math.round(value)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    } else {
      // International: Show 2 decimal places (€10.50, $25.00)
      formatted = `${currencySymbol}${value.toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    }
    
    console.log(`💱 formatCurrency: ${num} → ${formatted} (symbol: ${currencySymbol}, isINR: ${isINR})`);
    return formatted;
  };

  // ✅ Load user from localStorage so address API has userId
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  // ✅ PriceContext - with safety check
  const priceContext = usePriceContext();
  const { priceIncrease, currency, resolvedLocation, toConvert } = priceContext || {};

  useEffect(() => {
    console.log("🔄 Currency effect triggered:", { currency, toConvert });
    
    // Set currency symbol
    if (currency) {
      console.log("💱 Setting currency symbol for:", currency);
      const symbol = currencySymbols[currency] || "₹";
      setCurrencySymbol(symbol);
      console.log("💱 Currency symbol set to:", symbol);
      
      // ✅ For INR (India), always use conversion rate of 1
      if (currency === 'INR') {
        setConversionRate(1);
        console.log("💰 INR detected - using conversion rate: 1");
        return;
      }
    } else {
      console.log("⚠️ No currency set, keeping default ₹");
      setCurrencySymbol("₹");
      // ✅ Default to INR with no conversion
      setConversionRate(1);
      console.log("💰 No currency - using default conversion rate: 1");
      return;
    }
    
    // Set conversion rate for non-INR currencies
    if (toConvert && toConvert !== 1) {
      setConversionRate(Number(toConvert));
      console.log("💰 Using conversion rate from PriceContext:", toConvert);
    } else {
      // Fallback to localStorage only for non-INR
      try {
        const cached = JSON.parse(localStorage.getItem("locationPricing"));
        if (cached && cached.currency?.toconvert && cached.currency?.code !== 'INR') {
          setConversionRate(Number(cached.currency.toconvert));
          console.log("💰 Using conversion rate from localStorage:", cached.currency.toconvert);
        } else {
          setConversionRate(1);
          console.log("💰 Using default conversion rate: 1");
        }
      } catch (err) {
        console.warn("⚠️ Error reading localStorage:", err);
        setConversionRate(1);
      }
    }
  }, [currency, toConvert]);

  /* ---------- Fetch Minimum Order Quantity and Estimated Delivery Days ---------- */
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await fetch(`${API_BASE}/api/corporate-settings`);
        
        if (response.ok) {
          const result = await response.json();
          const settings = result.data || result;
          const minQty = settings.minOrderQuantity || 100;
          const deliveryDays = settings.estimatedDeliveryDays || 7;
          
          setMinOrderQty(minQty);
          console.log('✅ Loaded minimum order quantity:', minQty);
          
          // Calculate estimated delivery date
          const today = new Date();
          const deliveryDate = new Date(today);
          deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
          setEstimatedDeliveryDate(deliveryDate);
          console.log('📅 Loaded estimated delivery days:', deliveryDays, 'Delivery date:', deliveryDate.toLocaleDateString());
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch settings, using defaults');
        // Set default delivery date (7 days from now)
        const today = new Date();
        const deliveryDate = new Date(today);
        deliveryDate.setDate(deliveryDate.getDate() + 7);
        setEstimatedDeliveryDate(deliveryDate);
      }
    };
    
    fetchSettings();
  }, []);

  /* ---------- Products ---------- */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const data = await getproducts();
        if (Array.isArray(data)) setProducts(data);
      } catch (e) {
        toast.error("Failed to load products. Please refresh.");
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  /* ---------- Merge cart ---------- */
  useEffect(() => {
    if (products.length && cart.length) {
      console.log('🔄 Merging cart with products:', {
        cartLength: cart.length,
        productsLength: products.length
      });
      
      const merged = cart.map((ci) => {
        const p = products.find((x) => x._id === ci.id);
        const result = p ? { ...p, ...ci } : ci;
        
        console.log('🔍 Merged item:', {
          id: ci.id,
          name: result.products_name || result.name,
          price: result.price,
          pricing: result.pricing,
          foundProduct: !!p
        });
        
        return result;
      });
      setCart(merged);
    }
  }, [products]);

  const actualData = useMemo(() => {
    console.log('🔄 Computing actualData:', { cartLength: cart.length, productsLength: products.length });
    
    if (!cart.length) {
      console.warn('⚠️ Cart is empty!');
      return [];
    }
    
    const result = cart.map((ci) => {
      const p = products.find((x) => x._id === ci.id);
      
      // Merge product data with cart item data
      // Cart item data takes priority (spread last)
      const merged = p ? { ...p, ...ci } : { ...ci };
      
      // ✅ CRITICAL: Ensure price is preserved from cart item
      // The cart item should have the price that was set when added to cart
      if (ci.price !== undefined && ci.price !== null) {
        merged.price = ci.price;
      }
      
      // If still no price, try to get from product pricing array
      if (!merged.price && p?.pricing && Array.isArray(p.pricing) && p.pricing.length > 0) {
        merged.price = p.pricing[0]?.price_per || 0;
      }
      
      console.log('🔍 Merged item:', {
        id: ci.id,
        name: merged.products_name || merged.name,
        cartPrice: ci.price,
        mergedPrice: merged.price,
        quantity: merged.quantity,
        foundProduct: !!p
      });
      
      return merged;
    });
    
    console.log('✅ actualData computed:', result.length, 'items');
    return result;
  }, [cart, products]);

  /* ---------- Quantity & Costs ---------- */
  const totalQuantity = useMemo(
    () =>
      actualData.reduce(
        (sum, item) =>
          sum +
          Object.values(item.quantity || {}).reduce(
            (a, q) => a + safeNum(q),
            0
          ),
        0
      ),
    [actualData]
  );

  const printingUnits = useMemo(() => {
    return actualData.reduce((acc, item) => {
      const qty =
        Object.values(item.quantity || {}).reduce(
          (a, q) => a + safeNum(q),
          0
        ) || 0;
      const sides = countDesignSides(item);
      return acc + qty * sides;
    }, 0);
  }, [actualData]);

  // ✅ Calculate printing cost based on the number of sides
  const calculatePrintingCost = (item) => {
    const sides = countDesignSides(item);
    const costPerSide = 15; // ₹15 per side with design
    return sides * costPerSide; // Total printing cost for the item
  };

  // ✅ Calculate custom design cost (for text or uploaded image)
  const calculateDesignCost = (item) => {
    const textCost = item?.design?.customText ? 20 : 0; // Example: ₹20 for custom text
    const imageCost = item?.design?.uploadedImage ? 30 : 0; // Example: ₹30 for uploaded image
    return textCost + imageCost; // Total design cost
  };

  const itemsSubtotal = useMemo(() => {
    console.log('💰 Calculating itemsSubtotal:', {
      actualDataLength: actualData.length,
      cartLength: cart.length,
      actualData: actualData.map(i => ({ id: i.id, price: i.price, pricing: i.pricing, qty: i.quantity }))
    });
    
    if (!actualData.length) {
      console.warn('⚠️ actualData is empty!');
      return 0;
    }
    
    let total = 0;
    
    for (const item of actualData) {
      // Get quantity
      const qty = Object.values(item.quantity || {}).reduce((a, q) => a + safeNum(q), 0);
      
      if (qty === 0) {
        console.log(`⚠️ Item ${item.products_name || item.name} has 0 quantity`);
        continue;
      }
      
      // ✅ Get price - Priority: pricing array (actual product price) > item.price (cart price)
      // The pricing array contains the actual product price from the database
      let basePrice = 0;
      
      // First try to get from pricing array (actual product price)
      if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
        basePrice = safeNum(item.pricing[0]?.price_per, 0);
        console.log(`💰 Using pricing array price: ${basePrice}`);
      }
      
      // Fallback to item.price if pricing array doesn't have a valid price
      if (basePrice === 0) {
        basePrice = safeNum(item.price, 0);
        console.log(`💰 Using item.price: ${basePrice}`);
      }
      
      console.log(`💰 Item: ${item.products_name || item.name}, BasePrice(INR): ${basePrice}, Qty: ${qty}, Currency: ${currencySymbol}`);
      
      // ✅ For INR (₹), don't apply any conversion - use base price directly
      const isINR = currencySymbol === '₹' || !currencySymbol;
      const isCustomItem = item.id && String(item.id).startsWith('custom-tshirt-');
      let finalPrice = basePrice;
      
      // Only apply conversion for non-INR currencies and non-custom items
      if (!isCustomItem && !isINR && (priceIncrease || (conversionRate && conversionRate !== 1))) {
        finalPrice = applyLocationPricing(basePrice, priceIncrease, conversionRate);
        console.log(`💰 Applied location pricing: ${basePrice} INR → ${finalPrice} ${currencySymbol}`);
      }
      
      const lineTotal = finalPrice * qty;
      console.log(`💰 Line total: ${finalPrice} × ${qty} = ${lineTotal}`);
      total += lineTotal;
    }
    
    console.log(`💰 Total itemsSubtotal: ${total}`);
    return total;
  }, [actualData, priceIncrease, conversionRate, cart, currencySymbol]);

  const [pfPerUnit, setPfPerUnit] = useState(0);
  const [pfFlat, setPfFlat] = useState(0);
  const [printPerUnit, setPrintPerUnit] = useState(0);
  const [printingPerSide, setPrintingPerSide] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [b2cPrintingChargePerSide, setB2cPrintingChargePerSide] = useState(15); // ✅ B2C printing charge
  const [b2cPfChargePerUnit, setB2cPfChargePerUnit] = useState(10); // ✅ B2C P&F charge

  // ✅ Load B2C charges from settings
  useEffect(() => {
    const loadB2cCharges = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await fetch(`${API_BASE}/api/corporate-settings`);
        if (response.ok) {
          const result = await response.json();
          const settings = result.data || result;
          setB2cPrintingChargePerSide(settings.b2cPrintingChargePerSide || 15);
          setB2cPfChargePerUnit(settings.b2cPfChargePerUnit || 10);
          console.log('✅ Loaded B2C charges:', { 
            printing: settings.b2cPrintingChargePerSide, 
            pf: settings.b2cPfChargePerUnit 
          });
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch B2C charges, using defaults');
      }
    };
    loadB2cCharges();
  }, []);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoadingRates(true);
        
        // ✅ Try new endpoint first (getTotals)
        const res = await getChargePlanTotals(totalQuantity || 1, itemsSubtotal || 0);

        console.log('📊 Charge plan response:', res);

        if (res?.success && res?.data) {
          // ✅ New format from getTotals endpoint
          const pf = safeNum(res.data?.perUnit?.pakageingandforwarding, 0);
          const print = safeNum(res.data?.perUnit?.printingcost, 0);
          const gst = safeNum(res?.data?.perUnit?.gstPercent, 5);
          
          console.log('✅ Setting charge plan rates:', { pf, print, gst });
          setPfPerUnit(pf);
          setPrintPerUnit(print);
          setGstPercent(gst);
          setPfFlat(0);
          setPrintingPerSide(0);
          return;
        }

        // ✅ Fallback to old endpoint (getRates)
        console.log('⚠️ New endpoint failed, trying old endpoint...');
        const oldRes = await getChargePlanRates(totalQuantity || 1);
        
        console.log('📊 Old charge plan response:', oldRes);
        
        if (oldRes?.success && oldRes?.data) {
          const pf = safeNum(oldRes.data?.perUnit?.pakageingandforwarding, 0);
          const print = safeNum(oldRes.data?.perUnit?.printingcost, 0);
          const gst = safeNum(oldRes?.data?.gstPercent, 5);
          
          console.log('✅ Setting old charge plan rates:', { pf, print, gst });
          setPfPerUnit(pf);
          setPrintPerUnit(print);
          setGstPercent(gst);
          setPfFlat(0);
          setPrintingPerSide(0);
          return;
        }

        if (oldRes && (Array.isArray(oldRes.slabs) || oldRes.gstRate != null)) {
          const slab = pickSlab(oldRes, totalQuantity || 0);
          const pf = safeNum(slab?.pnfPerUnit, 0);
          const pfFlat = safeNum(slab?.pnfFlat, 0);
          const printSide = safeNum(slab?.printingPerSide ?? slab?.printingPerUnit, 0);
          const gst = safeNum((oldRes.gstRate ?? 0.05) * 100, 5);
          
          console.log('✅ Setting slab-based pricing:', { pf, pfFlat, printSide, gst });
          setPfPerUnit(pf);
          setPfFlat(pfFlat);
          setPrintingPerSide(printSide);
          setPrintPerUnit(0);
          setGstPercent(gst);
          return;
        }
        
        // ✅ If all else fails, use defaults
        console.warn('⚠️ Could not fetch charge plan, using defaults');
        setPfPerUnit(25);
        setPrintPerUnit(20);
        setGstPercent(5);
        setPfFlat(0);
        setPrintingPerSide(0);
      } catch (err) {
        console.warn("Could not fetch charge plan; using defaults", err);
        setPfPerUnit(25);
        setPrintPerUnit(20);
        setGstPercent(5);
        setPfFlat(0);
        setPrintingPerSide(0);
      } finally {
        setLoadingRates(false);
      }
    };

    // ✅ Fetch rates whenever we have items in cart
    if (totalQuantity > 0 || actualData.length > 0) {
      console.log('🔄 Fetching charge plan rates...', { totalQuantity, actualDataLength: actualData.length });
      fetchRates();
    }
  }, [totalQuantity, actualData.length]);

  const printingCost = useMemo(() => {
    // ✅ B2C Orders: Apply B2C printing charges per side
    const isBulkOrder = actualData.some(item => item.isCorporate === true);
    
    const isINR = currencySymbol === '₹' || !currencySymbol;
    
    const cost = actualData.reduce((total, item) => {
      const qty = Object.values(item.quantity || {}).reduce((a, q) => a + safeNum(q), 0);
      const sides = countDesignSides(item);
      
      // ✅ ONLY charge printing if there are actually printed sides
      if (sides === 0) {
        console.log(`🖨️ No printing for ${item.products_name || item.name} (0 sides)`);
        return total;
      }
      
      let itemCost = 0;
      
      if (isBulkOrder) {
        // ✅ B2B Orders: Use printPerUnit from charge plan (per unit, not per side)
        itemCost = qty * safeNum(printPerUnit, 0);
        console.log(`🖨️ B2B Printing cost for ${item.products_name || item.name}:`, {
          qty,
          sides,
          printPerUnit,
          itemCost,
        });
      } else {
        // ✅ B2C Orders: Use printing charge per side from settings
        itemCost = qty * sides * safeNum(printingPerSide, 0);
        console.log(`🖨️ B2C Printing cost for ${item.products_name || item.name}:`, {
          qty,
          sides,
          printingPerSide,
          itemCost,
        });
      }
      
      // ✅ Apply conversion for non-INR currencies
      if (!isINR && (priceIncrease || (conversionRate && conversionRate !== 1))) {
        itemCost = applyLocationPricing(itemCost, priceIncrease, conversionRate);
      }
      
      return total + itemCost;
    }, 0);
    console.log(`🖨️ Total printing cost: ${currencySymbol}${cost} (isINR: ${isINR})`);
    return cost;
  }, [actualData, printPerUnit, printingPerSide, currencySymbol, priceIncrease, conversionRate]);

  const pfCost = useMemo(() => {
    // ✅ Apply P&F charges for both B2B and B2C orders
    const isBulkOrder = actualData.some(item => item.isCorporate === true);
    
    const isINR = currencySymbol === '₹' || !currencySymbol;
    const totalQty = totalQuantity || 1;
    
    let cost = 0;
    
    if (isBulkOrder) {
      // ✅ B2B Orders: Use charge plan per-unit rate
      cost = safeNum(pfPerUnit, 0) * totalQty;
      console.log(`📦 B2B Order - P&F Cost: ${currencySymbol}${cost} (${pfPerUnit} per unit × ${totalQty} units)`);
    } else {
      // ✅ B2C Orders: Use B2C P&F charge per unit
      cost = safeNum(b2cPfChargePerUnit, 0) * totalQty;
      console.log(`📦 B2C Order - P&F Cost: ${currencySymbol}${cost} (${b2cPfChargePerUnit} per unit × ${totalQty} units)`);
    }
    
    // ✅ Apply conversion for non-INR currencies
    if (!isINR && (priceIncrease || (conversionRate && conversionRate !== 1))) {
      cost = applyLocationPricing(cost, priceIncrease, conversionRate);
    }
    
    console.log(`📦 P&F Cost: ${currencySymbol}${cost} (isINR: ${isINR}, isBulkOrder: ${isBulkOrder})`);
    return cost;
  }, [pfPerUnit, b2cPfChargePerUnit, totalQuantity, currencySymbol, priceIncrease, conversionRate, actualData]);

  const taxableAmount = useMemo(() => {
    return safeNum(itemsSubtotal) + safeNum(printingCost) + safeNum(pfCost);
  }, [itemsSubtotal, printingCost, pfCost]);

  const gstTotal = useMemo(() => {
    return (safeNum(taxableAmount) * safeNum(gstPercent)) / 100;
  }, [taxableAmount, gstPercent]);

  const baseTotal = useMemo(
    () => safeNum(taxableAmount) + safeNum(gstTotal),
    [taxableAmount, gstTotal]
  );

  const grandTotal = useMemo(() => {
    // ✅ pfCost and printingCost are already converted in their respective useMemo
    // ✅ itemsSubtotal is already converted in its useMemo
    
    // Taxable amount = items + printing + P&F (all already in target currency)
    const adjustedTaxable = safeNum(itemsSubtotal) + safeNum(printingCost) + safeNum(pfCost);
    
    // ✅ Check if this is a B2B order
    const isBulkOrder = actualData.some(item => item.isCorporate === true);
    
    let gstRate = 0;
    let adjustedGst = 0;
    
    // ✅ Only apply tax for B2B orders
    if (isBulkOrder) {
      // Determine GST rate based on location (use billing address)
      const customerState = billingAddress?.state || '';
      const customerCountry = billingAddress?.country || '';
      const isChhattisgarh = customerState.toLowerCase().includes('chhattisgarh') || customerState.toLowerCase().includes('chattisgarh');
      const countryLower = customerCountry.toLowerCase().trim();
      
      // Determine if India based on address country field
      let isIndia = false;
      if (customerCountry) {
        // If country is explicitly set, use it
        isIndia = countryLower === 'india' || 
                 countryLower === 'bharat' || 
                 countryLower === 'in' ||
                 countryLower.includes('india') || 
                 countryLower.includes('bharat');
      } else {
        // If no country set, check resolvedLocation
        // Asia = India (default), anything else = International
        isIndia = !resolvedLocation || resolvedLocation === 'Asia';
      }
      
      // ✅ B2B Tax Rates (Updated):
      // - Outside India: 1% TAX
      // - Chhattisgarh (same state): 5% CGST + SGST
      // - Other Indian states: 5% IGST
      if (!isIndia) {
        gstRate = 1; // TAX 1% for outside India
      } else {
        gstRate = 5; // 5% GST for all India (IGST or CGST+SGST)
      }
      
      // GST on adjusted taxable amount
      adjustedGst = (adjustedTaxable * gstRate) / 100;
    }
    // ✅ B2C: No tax (gstRate = 0, adjustedGst = 0)
    
    // Total before round off
    const total = adjustedTaxable + adjustedGst;
    
    const isINR = currencySymbol === '₹' || !currencySymbol;
    console.log(`💰 Grand Total Calculation:`, {
      itemsSubtotal: safeNum(itemsSubtotal),
      printingCost: safeNum(printingCost),
      pfCost: safeNum(pfCost),
      adjustedTaxable,
      isBulkOrder,
      gstRate,
      adjustedGst,
      totalBeforeRoundOff: total,
      totalAfterRoundOff: Math.ceil(total),
      currency: currencySymbol,
      isINR,
      conversionRate,
      priceIncrease,
      orderType: isBulkOrder ? 'B2B' : 'B2C'
    });
    
    return total; // Return before round off, we'll round in display
  }, [itemsSubtotal, printingCost, pfCost, currencySymbol, billingAddress, actualData, resolvedLocation, conversionRate, priceIncrease]);

  if (loadingProducts) return <Loading />;
  if (!cart.length)
    return (
      <div className="p-8 text-center text-gray-400 text-xl">
        Your cart is empty.
      </div>
    );

  return (
    <div className="min-h-screen text-white p-8">
      <h1 className="text-3xl font-bold mb-8">SHOPPING CART</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items */}
        <div className="flex-1">
          {actualData.map((item, i) => (
            <CartItem
              key={`${item._id}-${i}`}
              item={item}
              removeFromCart={() =>
                removeFromCart(item.id, item.quantity, item.color, item.design)
              }
              updateQuantity={(newQty) =>
                updateQuantity(
                  item.id,
                  newQty
                )
              }
            />
          ))}
        </div>

        {/* Summary */}
        <div className="lg:w-96 flex flex-col">
          <div
            className="lg:w-96 h-fit rounded-sm p-6"
            style={{ backgroundColor: "#112430" }}
          >
            <h2 className="text-2xl font-bold mb-6">ORDER SUMMARY</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span>{formatCurrency(itemsSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Printing Charges ({printingUnits} sides)</span>
                <span>{formatCurrency(printingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>P&F Charges</span>
                <span>{formatCurrency(pfCost)}</span>
              </div>
              
              {/* Subtotal before GST - matching invoice format */}
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">{formatCurrency(itemsSubtotal + printingCost + pfCost)}</span>
              </div>
              
              {/* Tax Breakdown - Only for B2B orders */}
              {(() => {
                // ✅ Check if this is a B2B order
                const isBulkOrder = actualData.some(item => item.isCorporate === true);
                
                if (!isBulkOrder) {
                  // ✅ B2C Orders: NO TAX
                  return null;
                }
                
                // ✅ If no billing address selected, show message
                if (!billingAddress) {
                  return (
                    <div className="flex justify-between text-yellow-400 text-sm italic">
                      <span>Tax: Select address to calculate</span>
                    </div>
                  );
                }
                
                // ✅ B2B Orders: Show GST breakdown (Updated rates)
                const taxableAmount = itemsSubtotal + printingCost + pfCost;
                const customerState = billingAddress?.state || '';
                const isChhattisgarh = customerState.toLowerCase().includes('chhattisgarh') || customerState.toLowerCase().includes('chattisgarh');
                
                // Check if in India
                const customerCountry = billingAddress?.country || '';
                const countryLower = customerCountry.toLowerCase().trim();
                
                // Determine if India based on address country field
                let isIndia = false;
                if (customerCountry) {
                  // If country is explicitly set, use it
                  isIndia = countryLower === 'india' || 
                           countryLower === 'bharat' || 
                           countryLower === 'in' ||
                           countryLower.includes('india') || 
                           countryLower.includes('bharat');
                } else {
                  // If no country set, check resolvedLocation
                  // Asia = India (default), anything else = International
                  isIndia = !resolvedLocation || resolvedLocation === 'Asia';
                }
                
                console.log('🌍 Tax Calculation Debug (B2B):', {
                  billingAddress,
                  shippingAddress,
                  customerState,
                  isChhattisgarh,
                  customerCountry,
                  countryLower,
                  resolvedLocation,
                  isIndia,
                  currency,
                  currencySymbol,
                  taxableAmount
                });
                
                if (!isIndia) {
                  // ✅ Outside India: TAX 1%
                  const taxAmount = (taxableAmount * 1) / 100;
                  return (
                    <div className="flex justify-between">
                      <span>TAX (1%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  );
                } else if (isChhattisgarh) {
                  // ✅ Same state (Chhattisgarh): CGST 2.5% + SGST 2.5% = 5%
                  const cgstAmount = (taxableAmount * 2.5) / 100;
                  const sgstAmount = (taxableAmount * 2.5) / 100;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (2.5%)</span>
                        <span>{formatCurrency(cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (2.5%)</span>
                        <span>{formatCurrency(sgstAmount)}</span>
                      </div>
                    </>
                  );
                } else {
                  // ✅ Different state in India: IGST 5%
                  const igstAmount = (taxableAmount * 5) / 100;
                  return (
                    <div className="flex justify-between">
                      <span>IGST (5%)</span>
                      <span>{formatCurrency(igstAmount)}</span>
                    </div>
                  );
                }
              })()}
              
              {/* Location pricing adjustment if applicable */}
              {priceIncrease && priceIncrease > 0 && (
                <div className="flex justify-between text-yellow-400 text-sm">
                  <span>✓ Location Pricing Applied ({resolvedLocation})</span>
                  <span>+{safeNum(priceIncrease)}%</span>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t pt-4 mb-6">
              <span className="font-bold">Grand Total</span>
              <span className="font-bold">{formatCurrency(Math.ceil(grandTotal))}</span>
            </div>

            {/* Estimated Delivery Date */}
            {estimatedDeliveryDate && (
              <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <div>
                      <p className="text-sm text-gray-400">Estimated Delivery</p>
                      <p className="text-lg font-semibold text-blue-300">
                        {estimatedDeliveryDate.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>Delivery in</p>
                    <p className="text-sm font-semibold text-blue-300">
                      {Math.ceil((estimatedDeliveryDate - new Date()) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* GST/Tax Code Input (Optional) */}
            <div className="mb-6">
              <label htmlFor="gstNumber" className="block text-sm font-medium text-white mb-2">
                GST/Tax Number (Optional)
              </label>
              <input
                type="text"
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="Enter GST/Tax Number (e.g., 22AAAAA0000A1Z5)"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                maxLength={15}
              />
              <p className="text-xs text-gray-400 mt-1">
                💡 Add your GST/Tax number to include it on your invoice
              </p>
            </div>

            {/* Bulk Order Minimum Quantity Warning */}
            {(() => {
              // ✅ Identify B2B/Corporate products only (bulk orders)
              const bulkItems = actualData.filter(item => {
                return item.isCorporate === true;
              });
              
              const itemsBelowMinimum = bulkItems.filter(item => {
                const itemQty = Object.values(item.quantity || {}).reduce((sum, q) => sum + safeNum(q), 0);
                return itemQty > 0 && itemQty < minOrderQty;
              });

              if (itemsBelowMinimum.length > 0) {
                return (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                    <p className="text-red-300 text-sm font-semibold mb-2">⚠️ Bulk Order Minimum Not Met</p>
                    <p className="text-red-200 text-xs mb-2">Cannot proceed to checkout</p>
                    {itemsBelowMinimum.map((item, idx) => {
                      const itemQty = Object.values(item.quantity || {}).reduce((sum, q) => sum + safeNum(q), 0);
                      return (
                        <p key={idx} className="text-red-200 text-xs">
                          • {item.products_name || item.name}: {itemQty}/{minOrderQty} units (need {minOrderQty - itemQty} more)
                        </p>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}

            <button
              className="w-full py-4 font-bold bg-yellow-400 text-black hover:bg-yellow-300 cursor-pointer"
              onClick={async () => {
                // ✅ Check if cart is empty
                if (!actualData || actualData.length === 0) {
                  toast.error("⚠ Your cart is empty");
                  return;
                }

                if (!billingAddress || !shippingAddress) {
                  if (!billingAddress) {
                    toast.error("⚠ Please select a billing address");
                  } else if (!shippingAddress) {
                    toast.error("⚠ Please select a shipping address");
                  }
                  return;
                }

                // ✅ Validate totalPay before proceeding
                const finalTotal = Math.ceil(grandTotal);
                if (!finalTotal || finalTotal <= 0 || isNaN(finalTotal)) {
                  toast.error("⚠ Invalid order total. Please refresh the page and try again.");
                  console.error("❌ Invalid grandTotal:", {
                    grandTotal,
                    finalTotal,
                    itemsSubtotal,
                    printingCost,
                    pfCost,
                    gstTotal,
                    taxableAmount,
                    billingAddress,
                    shippingAddress,
                    resolvedLocation,
                    cartLength: cart?.length || 0,
                    actualDataLength: actualData?.length || 0,
                    actualData: actualData?.map(item => ({
                      name: item.products_name || item.name,
                      price: item.price,
                      quantity: item.quantity
                    }))
                  });
                  return;
                }

                // ✅ Check minimum quantity for bulk orders
                try {
                  console.log('🔍 Minimum order quantity from settings:', minOrderQty);

                  // Check ALL items - identify bulk items by multiple criteria
                  for (const item of actualData) {
                    const itemQty = Object.values(item.quantity || {}).reduce((sum, q) => sum + safeNum(q), 0);
                    
                    // ✅ Check if item is B2B/Corporate product (bulk order)
                    const isBulkItem = item.isCorporate === true;
                    
                    console.log(`📦 Checking item: ${item.products_name || item.name}`, {
                      quantity: itemQty,
                      isCorporate: item.isCorporate,
                      isBulkItem,
                      meetsMinimum: itemQty >= minOrderQty
                    });
                    
                    // ✅ Block ONLY if it's a B2B/Corporate product and doesn't meet minimum
                    if (isBulkItem && itemQty > 0 && itemQty < minOrderQty) {
                      toast.error(`⚠️ Minimum order quantity for B2B products is ${minOrderQty} units. "${item.products_name || item.name}" has only ${itemQty} units. Please add ${minOrderQty - itemQty} more units or remove it from cart.`, {
                        autoClose: 6000,
                      });
                      return;
                    }
                  }
                  
                  console.log('✅ All items validated successfully');
                } catch (error) {
                  console.error('❌ Error validating minimum quantity:', error);
                  toast.error('Unable to validate order. Please try again.');
                  return;
                }

                // ✅ Debug: Log cart data before navigation
                console.group("🛒 CART: Checkout Debug");
                console.log("📦 Cart items being sent to payment:", actualData.length);
                console.log("💰 Pricing breakdown:", {
                  itemsSubtotal,
                  printingCost,
                  pfCost,
                  printingUnits,
                  gstTotal,
                  grandTotal,
                  totalPay: Math.ceil(grandTotal),
                  billingAddress,
                  shippingAddress,
                  resolvedLocation,
                  currency,
                  conversionRate,
                  priceIncrease
                });
                console.log("🛍️ Individual items:", actualData.map(item => ({
                  name: item.products_name || item.name,
                  price: item.price,
                  quantity: item.quantity,
                  id: item.id,
                  hasDesign: !!item.design,
                  timestamp: new Date().toISOString()
                })));
                console.groupEnd();

                // ✅ Convert display amount back to INR for Razorpay (Razorpay only accepts INR)
                const displayTotal = Math.ceil(grandTotal);
                const totalPayINR = conversionRate && conversionRate !== 1 
                  ? Math.ceil(displayTotal / conversionRate) // Convert back to INR
                  : displayTotal; // Already in INR
                
                console.log('💳 Payment amount conversion:', {
                  displayCurrency: currency,
                  displayTotal: `${currencySymbol}${displayTotal}`,
                  conversionRate,
                  totalPayINR: `₹${totalPayINR}`,
                  calculation: conversionRate !== 1 ? `${displayTotal} / ${conversionRate} = ${totalPayINR}` : 'No conversion needed'
                });

                // ✅ Fix item prices before sending to backend
                // Use actual product price from pricing array, not cart price
                const itemsWithCorrectPrices = actualData.map(item => {
                  let correctPrice = 0;
                  
                  // Priority: pricing array (actual product price) > item.price (cart price)
                  if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
                    correctPrice = Number(item.pricing[0]?.price_per) || 0;
                  } else {
                    correctPrice = Number(item.price) || 0;
                  }
                  
                  console.log(`📦 Item price fix: ${item.products_name || item.name} - Cart: ${item.price}, Actual: ${correctPrice}`);
                  
                  return {
                    ...item,
                    price: correctPrice, // ✅ Use correct product price
                  };
                });

                navigate("/payment", {
                  state: {
                    items: itemsWithCorrectPrices,
                    // ✅ Charges at root level for backend
                    pf: pfCost,
                    printing: printingCost,
                    gst: gstTotal,
                    gstPercent: gstPercent,
                    // ✅ Totals breakdown
                    totals: {
                      itemsSubtotal,
                      printingCost,
                      pfCost,
                      printingUnits,
                      taxableAmount,
                      gstPercent,
                      gstTotal,
                      locationIncreasePercent: priceIncrease || 0,
                      grandTotal,
                      conversionRate: conversionRate,
                    },
                    totalPay: totalPayINR, // ✅ Send INR amount to Razorpay
                    totalPayDisplay: displayTotal, // ✅ Keep display amount for reference
                    displayCurrency: currency, // ✅ Keep currency for reference
                    conversionRate: conversionRate, // ✅ ADD: Include at root level for easy access
                    addresses: {
                      billing: billingAddress,
                      shipping: shippingAddress,
                      sameAsBilling: billingAddress === shippingAddress
                    },
                    user,
                    gstNumber: gstNumber.trim() || null, // ✅ Include GST number if provided
                  },
                });
              }}
            >
              CHECK OUT
            </button>

           
          </div>

          <AddressManagerEnhanced
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            shippingAddress={shippingAddress}
            setShippingAddress={setShippingAddress}
            user={user}
            setUser={setUser}
          />
        </div>
      </div>

      {/* ✅ Off-screen Invoice */}
      <div
        ref={invoiceRef}
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          background: "#fff",
        }}
      >
        {console.log('🔍 Final GST Percent being passed to invoice:', gstPercent)}
        <InvoiceDucoTailwind
          data={{
            company: {
              name: "DUCO ART PRIVATE LIMITED",
              address: "123 Teen Murti Marg, New Delhi, India",
              gstin: "22AAICD1719N1ZM",
              email: "support@ducoart.com",
            },
            invoice: {
              number: "TEST-" + Math.floor(Math.random() * 10000),
              date: new Date().toLocaleDateString(),
              placeOfSupply: billingAddress?.state || "Delhi",
              copyType: "Original Copy",
            },
            billTo: {
              name: billingAddress?.fullName || user?.name || "Guest User",
              address: billingAddress 
                ? `${billingAddress.houseNumber}, ${billingAddress.street}, ${billingAddress.city}, ${billingAddress.state} - ${billingAddress.pincode}, ${billingAddress.country}`
                : "Not provided",
              phone: billingAddress?.mobileNumber || user?.phone || "N/A",
              gstNumber: gstNumber.trim() || null, // ✅ Customer GST number
            },
            shipTo: {
              name: shippingAddress?.fullName || user?.name || "Guest User",
              address: shippingAddress 
                ? `${shippingAddress.houseNumber}, ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}, ${shippingAddress.country}`
                : "Not provided",
              phone: shippingAddress?.mobileNumber || user?.phone || "N/A",
            },
            items: actualData.map((item, idx) => {
              const sizes = Object.entries(item.quantity || {})
                .filter(([_, qty]) => qty > 0)
                .map(([size, qty]) => `${size} × ${qty}`)
                .join(", ");
              
              // ✅ Get correct price - prioritize pricing array (actual product price)
              let itemPrice = 0;
              if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
                itemPrice = Number(item.pricing[0]?.price_per) || 0;
              } else {
                itemPrice = Number(item.price) || 0;
              }
              
              return {
                sno: idx + 1,
                description: `${item.name || "Product"}${
                  sizes ? ` (Sizes: ${sizes})` : ""
                }${item.color ? `, Color: ${item.color}` : ""}`,
                qty: Object.values(item.quantity || {}).reduce(
                  (a, b) => a + Number(b || 0),
                  0
                ),
                unit: "Pcs.",
                price: itemPrice,
              };
            }),
            subtotal: itemsSubtotal,
            total: grandTotal,
            gstPercent,
            printingCost,
            pfCost,
            locationTax: {
              country: resolvedLocation,
              percentage: priceIncrease || 0,
              currency: { country: currency, toconvert: conversionRate },
            },
            formatCurrency,
            orderType: actualData.some(item => item.isCorporate === true) ? 'B2B' : 'B2C', // ✅ Add orderType
          }}
        />
      </div>
    </div>
  );
};

export default Cart;

