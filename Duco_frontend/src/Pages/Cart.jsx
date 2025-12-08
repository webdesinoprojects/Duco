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
              <td style={{ textAlign: "right", padding: "6px" }}>{data.formatCurrency(data.subtotal + (data.pfCost || 0))}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>Printing Charges</td>
              <td style={{ textAlign: "center", padding: "6px" }}>-</td>
              <td style={{ textAlign: "right", padding: "6px" }}>{data.formatCurrency(data.subtotal + (data.pfCost || 0) + (data.printingCost || 0))}</td>
            </tr>
            
            {data.locationTax?.percentage > 0 && (
              <tr>
                <td style={{ padding: "6px" }}>Location Adjustment ({data.locationTax.country})</td>
                <td style={{ textAlign: "center", padding: "6px" }}>
                  {data.formatCurrency((data.subtotal + (data.printingCost || 0) + (data.pfCost || 0)) * (data.locationTax.percentage / 100))}
                </td>
                <td style={{ textAlign: "right", padding: "6px" }}>
                  {data.formatCurrency(data.subtotal + (data.pfCost || 0) + (data.printingCost || 0) + ((data.subtotal + (data.printingCost || 0) + (data.pfCost || 0)) * (data.locationTax.percentage / 100)))}
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

  const navigate = useNavigate();
  const invoiceRef = useRef();

  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [conversionRate, setConversionRate] = useState(1);
  const [minOrderQty, setMinOrderQty] = useState(100); // Default minimum order quantity
  const [gstNumber, setGstNumber] = useState(""); // Optional GST/Tax code

  // ✅ Dynamic Currency Formatter (prices are already location-adjusted at item level)
  const formatCurrency = (num) => {
    const formatted = `${currencySymbol}${Math.round(safeNum(num, 0))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    console.log(`💱 formatCurrency: ${num} → ${formatted} (symbol: ${currencySymbol})`);
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
    } else {
      console.log("⚠️ No currency set, keeping default ₹");
      setCurrencySymbol("₹");
    }
    
    // Set conversion rate
    if (toConvert) {
      setConversionRate(Number(toConvert));
      console.log("💰 Using conversion rate from PriceContext:", toConvert);
    } else {
      // Fallback to localStorage
      try {
        const cached = JSON.parse(localStorage.getItem("locationPricing"));
        if (cached && cached.currency?.toconvert) {
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

  /* ---------- Fetch Minimum Order Quantity ---------- */
  useEffect(() => {
    const fetchMinOrderQty = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await fetch(`${API_BASE}/api/corporate-settings`);
        
        if (response.ok) {
          const result = await response.json();
          const settings = result.data || result;
          const minQty = settings.minOrderQuantity || 100;
          setMinOrderQty(minQty);
          console.log('✅ Loaded minimum order quantity:', minQty);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch minimum order quantity, using default (100)');
      }
    };
    
    fetchMinOrderQty();
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
    if (!cart.length) return [];
    return cart.map((ci) => {
      const p = products.find((x) => x._id === ci.id);
      const merged = p ? { ...p, ...ci } : ci;
      
      // ✅ Ensure price is set - try multiple sources
      if (!merged.price || merged.price === 0) {
        if (p?.pricing && Array.isArray(p.pricing) && p.pricing.length > 0) {
          merged.price = p.pricing[0]?.price_per || 0;
          console.log(`🔧 Fixed price for ${merged.products_name || merged.name}: ${merged.price}`);
        } else if (ci.price) {
          merged.price = ci.price;
        }
      }
      
      return merged;
    });
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
    console.log('💰 Calculating itemsSubtotal with:', {
      actualDataLength: actualData.length,
      priceIncrease,
      conversionRate,
      currencySymbol
    });
    
    return actualData.reduce((sum, item) => {
      console.log('🔍 Processing item:', {
        id: item.id,
        name: item.name || item.products_name,
        price: item.price,
        pricingArray: item.pricing,
        quantity: item.quantity,
        isCustomItem: item.id && item.id.startsWith('custom-tshirt-')
      });
      
      const qty = Object.values(item.quantity || {}).reduce(
        (a, q) => a + safeNum(q),
        0
      );
      
      console.log('🔍 Calculated quantity:', qty);
      
      // ✅ ALWAYS use pricing array from database for base INR price (not item.price which might be converted)
      let basePrice = 0;
      
      // Check if item is from TShirtDesigner (custom item with already applied pricing)
      const isCustomItem = item.id && item.id.startsWith('custom-tshirt-');
      
      if (isCustomItem) {
        // Custom items: use item.price as it's already converted
        basePrice = safeNum(item.price);
        console.log(`🔍 Custom item - using pre-converted price: ${basePrice}`);
      } else {
        // Regular products: ALWAYS use pricing array for base INR price
        if (item.pricing && Array.isArray(item.pricing) && item.pricing.length > 0) {
          basePrice = safeNum(item.pricing[0]?.price_per, 0);
          console.log(`🔍 Regular item - using base INR price from pricing array: ${basePrice}`);
        } else if (item.price) {
          // Fallback to item.price only if pricing array not available
          // But check if it's suspiciously low (might be already converted)
          const priceValue = safeNum(item.price);
          if (priceValue > 100 || currency === 'INR') {
            // Likely in INR (t-shirts are usually > ₹100)
            basePrice = priceValue;
            console.log(`🔍 Using item.price as base (likely INR): ${basePrice}`);
          } else {
            // Suspiciously low - might be already converted, use a default
            console.warn(`⚠️ Item ${item.name || item.products_name} has suspicious price ${priceValue}, might be already converted`);
            basePrice = 499; // Default t-shirt price in INR
          }
        }
      }
      
      // If still 0, log warning
      if (basePrice === 0) {
        console.warn(`⚠️ Item ${item.name || item.products_name} has price 0!`);
      }
      
      let itemTotal;
      
      if (isCustomItem) {
        // ✅ Custom items already have location pricing applied in TShirtDesigner
        itemTotal = basePrice;
        console.log(`💰 Custom item ${item.name}: Using pre-converted price ${itemTotal} (qty: ${qty})`);
      } else {
        // ✅ Regular products - apply location pricing to base INR price
        itemTotal = applyLocationPricing(
          basePrice,
          priceIncrease,
          conversionRate
        );
        console.log(`💰 Regular item ${item.name || item.products_name}: Base INR ${basePrice} → ${itemTotal} ${currencySymbol} (after location pricing, qty: ${qty})`);
      }

      const lineTotal = itemTotal * qty;
      console.log(`💰 Line total for ${item.name || item.products_name}: ${itemTotal} × ${qty} = ${lineTotal}`);
      return sum + lineTotal;
    }, 0);
  }, [actualData, priceIncrease, conversionRate, currencySymbol]);

  const [pfPerUnit, setPfPerUnit] = useState(0);
  const [pfFlat, setPfFlat] = useState(0);
  const [printPerUnit, setPrintPerUnit] = useState(0);
  const [printingPerSide, setPrintingPerSide] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoadingRates(true);
        
        // ✅ Try new endpoint first (getTotals)
        const res = await getChargePlanTotals(totalQuantity || 1, itemsSubtotal || 0);

        if (res?.success && res?.data) {
          // ✅ New format from getTotals endpoint
          setPfPerUnit(safeNum(res.data?.perUnit?.pakageingandforwarding, 0));
          setPrintPerUnit(safeNum(res.data?.perUnit?.printingcost, 0));
          console.log('✅ Using new charge plan totals:', res.data);
          setGstPercent(safeNum(res?.data?.perUnit?.gstPercent, 5));
          setPfFlat(0);
          setPrintingPerSide(0);
          return;
        }

        // ✅ Fallback to old endpoint (getRates)
        const oldRes = await getChargePlanRates(totalQuantity || 1);
        
        if (oldRes?.success && oldRes?.data) {
          setPfPerUnit(safeNum(oldRes.data?.perUnit?.pakageingandforwarding, 0));
          setPrintPerUnit(safeNum(oldRes.data?.perUnit?.printingcost, 0));
          console.log('⚠️ Using old charge plan rates (fallback):', oldRes.data);
          setGstPercent(safeNum(oldRes?.data?.gstPercent, 5));
          setPfFlat(0);
          setPrintingPerSide(0);
          return;
        }

        if (oldRes && (Array.isArray(oldRes.slabs) || oldRes.gstRate != null)) {
          const slab = pickSlab(oldRes, totalQuantity || 0);
          setPfPerUnit(safeNum(slab?.pnfPerUnit, 0));
          setPfFlat(safeNum(slab?.pnfFlat, 0));
          setPrintingPerSide(
            safeNum(slab?.printingPerSide ?? slab?.printingPerUnit, 0)
          );
          setPrintPerUnit(0);
          console.log('⚠️ Using slab-based pricing (fallback):', slab);
          setGstPercent(safeNum((oldRes.gstRate ?? 0.05) * 100, 5));
          return;
        }
      } catch (err) {
        console.warn("Could not fetch charge plan; using defaults", err);
        console.log('🔍 Using default GST: 5%');
        setGstPercent(5);
      } finally {
        setLoadingRates(false);
      }
    };

    if (itemsSubtotal > 0 && totalQuantity > 0) fetchRates();
  }, [itemsSubtotal, totalQuantity]);

  const printingCost = useMemo(() => {
    // ✅ Calculate printing cost using charge plan per-unit rate
    const cost = actualData.reduce((total, item) => {
      const qty = Object.values(item.quantity || {}).reduce((a, q) => a + safeNum(q), 0);
      // ✅ Use printPerUnit from charge plan (per unit, not per side)
      const itemCost = qty * safeNum(printPerUnit, 0);
      console.log(`🖨️ Printing cost for ${item.products_name || item.name}:`, {
        qty,
        printPerUnit,
        itemCost,
      });
      return total + itemCost;
    }, 0);
    console.log(`🖨️ Total printing cost: ₹${cost}`);
    return cost;
  }, [actualData, printPerUnit]);

  const pfCost = useMemo(() => {
    // ✅ Calculate P&F charge using charge plan per-unit rate
    const totalQty = totalQuantity || 1;
    const cost = safeNum(pfPerUnit, 0) * totalQty;
    console.log(`📦 P&F Cost: ₹${cost} (${pfPerUnit} per unit × ${totalQty} units)`);
    return cost;
  }, [pfPerUnit, totalQuantity]);

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
    // ✅ P&F charges get location pricing, printing charges stay fixed
    const pfWithLocation = applyLocationPricing(pfCost, priceIncrease, conversionRate);
    
    // Taxable amount = items (with location pricing) + printing (fixed) + P&F (with location pricing)
    const adjustedTaxable = safeNum(itemsSubtotal) + safeNum(printingCost) + pfWithLocation;
    
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
      
      // B2B: 18% GST
      if (!isIndia) {
        gstRate = 18; // TAX 18% for outside India
      } else if (isChhattisgarh) {
        gstRate = 18; // CGST 9% + SGST 9% + IGST 0% = 18%
      } else {
        gstRate = 18; // CGST 0% + SGST 0% + IGST 18% = 18%
      }
      
      // GST on adjusted taxable amount
      adjustedGst = (adjustedTaxable * gstRate) / 100;
    }
    // ✅ B2C: No tax (gstRate = 0, adjustedGst = 0)
    
    // Total before round off
    const total = adjustedTaxable + adjustedGst;
    
    console.log(`💰 Grand Total Calculation:`, {
      itemsSubtotal: safeNum(itemsSubtotal),
      printingCost: safeNum(printingCost),
      pfCost: safeNum(pfCost),
      pfWithLocation,
      adjustedTaxable,
      isBulkOrder,
      gstRate,
      adjustedGst,
      totalBeforeRoundOff: total,
      totalAfterRoundOff: Math.ceil(total),
      currency: currencySymbol,
      orderType: isBulkOrder ? 'B2B' : 'B2C'
    });
    
    return total; // Return before round off, we'll round in display
  }, [itemsSubtotal, printingCost, pfCost, priceIncrease, conversionRate, currencySymbol, billingAddress, actualData]);

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
                  item.quantity,
                  item.color,
                  item.design,
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
                <span>{formatCurrency(applyLocationPricing(pfCost, priceIncrease, conversionRate))}</span>
              </div>
              
              {/* Subtotal before GST - matching invoice format */}
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium">Subtotal</span>
                <span className="font-medium">{formatCurrency(itemsSubtotal + printingCost + applyLocationPricing(pfCost, priceIncrease, conversionRate))}</span>
              </div>
              
              {/* Tax Breakdown - Only for B2B orders */}
              {(() => {
                // ✅ Check if this is a B2B order
                const isBulkOrder = actualData.some(item => item.isCorporate === true);
                
                if (!isBulkOrder) {
                  // ✅ B2C Orders: NO TAX
                  return null;
                }
                
                // ✅ B2B Orders: Show 18% GST breakdown
                const pfWithLocation = applyLocationPricing(pfCost, priceIncrease, conversionRate);
                const taxableAmount = itemsSubtotal + printingCost + pfWithLocation;
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
                  customerCountry,
                  countryLower,
                  resolvedLocation,
                  isIndia,
                  currency,
                  currencySymbol
                });
                
                if (!isIndia) {
                  // Outside India: TAX 18%
                  const taxAmount = (taxableAmount * 18) / 100;
                  return (
                    <div className="flex justify-between">
                      <span>TAX (18%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                  );
                } else if (isChhattisgarh) {
                  // ✅ Same state (Chhattisgarh): CGST 9% + SGST 9% (Intra-state)
                  const cgstAmount = (taxableAmount * 9) / 100;
                  const sgstAmount = (taxableAmount * 9) / 100;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>CGST (9%)</span>
                        <span>{formatCurrency(cgstAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%)</span>
                        <span>{formatCurrency(sgstAmount)}</span>
                      </div>
                    </>
                  );
                } else {
                  // ✅ Different state in India: IGST 18% only (Inter-state)
                  const igstAmount = (taxableAmount * 18) / 100;
                  return (
                    <div className="flex justify-between">
                      <span>IGST (18%)</span>
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

                navigate("/payment", {
                  state: {
                    items: actualData,
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

            <button
              onClick={() => {
                const input = invoiceRef.current;
                if (!input) return;
                html2canvas(input, { scale: 2, useCORS: true }).then(
                  (canvas) => {
                    const imgData = canvas.toDataURL("image/png");
                    const pdf = new jsPDF("p", "mm", "a4");
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const ratio = pageWidth / canvas.width;
                    pdf.addImage(
                      imgData,
                      "PNG",
                      0,
                      10,
                      pageWidth,
                      canvas.height * ratio
                    );
                    pdf.save("Invoice.pdf");
                  }
                );
              }}
              disabled={!actualData.length}
              className="mt-4 w-full py-3 rounded bg-black text-white hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              Download Invoice (PDF)
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
                price: item.price,
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

