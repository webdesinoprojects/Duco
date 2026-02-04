import React, { useState, useMemo, useEffect, useContext } from "react";
import PaymentButton from "../Components/PaymentButton";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NetbankingPanel from "../Components/NetbankingPanel.jsx";
import {
  completeOrder,
  uploadDesignImagesForOrder,
  getActiveBankDetails,
} from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext.jsx";
import { usePriceContext } from "../ContextAPI/PriceContext.jsx";

/* ------------------------------ currency symbols ------------------------------ */
const currencySymbols = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  NZD: "NZ$",
  CHF: "CHF",
  JPY: "¥",
  CNY: "¥",
  HKD: "HK$",
  MYR: "RM",
  THB: "฿",
  SAR: "﷼",
  QAR: "ر.ق",
  KWD: "KD",
  BHD: "BD",
  OMR: "﷼",
  ZAR: "R",
  PKR: "₨",
  LKR: "Rs",
  BDT: "৳",
  NPR: "रू",
  PHP: "₱",
  IDR: "Rp",
  KRW: "₩",
};

/* ------------------------------ helpers ------------------------------ */
const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
const maskAccount = (acc = "") =>
  acc ? `${"*".repeat(Math.max(0, acc.length - 4))}${acc.slice(-4)}` : acc;
const validIFSC = (s = "") => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(s).toUpperCase());
const validUPI = (s = "") =>
  /^[\w.\-_]{2,}@[a-zA-Z]{2,}$/i.test(String(s).trim());
const validPhone10 = (s = "") => /^\d{10}$/.test(onlyDigits(s));

/* -------------------------------- Page -------------------------------- */
const PaymentPage = () => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPayNow, setShowPayNow] = useState(false);
  const [showNetModal, setShowNetModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Netbanking (BANK) fields
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [utr, setUtr] = useState("");

  // Pickup from store fields
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupWhen, setPickupWhen] = useState(""); // datetime-local
  const [pickupNotes, setPickupNotes] = useState("");

  const [errors, setErrors] = useState({});

  const locations = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();
  
  // ✅ Get currency from PriceContext (with safety check)
  const priceContext = usePriceContext() || {};
  const { currency, toConvert } = priceContext;
  const currencySymbol = currencySymbols[currency] || "₹";

  const orderpayload = locations.state || {};

  const [cartLoaded, setCartLoaded] = useState(false);
  useEffect(() => {
    try {
      // ✅ Only use localStorage cart if no fresh order payload exists
      if (!orderpayload?.items?.length) {
        const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
        if (savedCart && savedCart.length > 0) {
          console.log("🛒 Using localStorage cart as fallback:", savedCart);
        }
      } else {
        console.log("✅ Using fresh order payload, ignoring localStorage cart");
      }
    } catch (error) {
      console.error("❌ Error loading cart data:", error);
    } finally {
      setCartLoaded(true);
    }
  }, [orderpayload]);

  useEffect(() => {
    if (!orderpayload) return;
    console.group("🧾 PAYMENT PAGE: Data Source Analysis");
    console.log("📦 Order payload from Cart page:", {
      hasItems: !!orderpayload?.items?.length,
      itemCount: orderpayload?.items?.length || 0,
      totalPay: orderpayload?.totalPay || 0,
      items: orderpayload?.items?.map(item => ({
        name: item.products_name || item.name,
        price: item.price,
        timestamp: item.timestamp || 'Unknown'
      })) || []
    });
    console.log("🛒 Cart context data:", {
      hasItems: !!cart?.length,
      itemCount: cart?.length || 0,
      items: cart?.map(item => ({
        name: item.products_name || item.name,
        price: item.price,
        timestamp: item.timestamp || 'Unknown'
      })) || []
    });
    
    const finalItems = orderpayload?.items?.length > 0 ? orderpayload.items : cart || [];
    console.log("✅ Final items that will be used:", {
      source: orderpayload?.items?.length > 0 ? 'Order Payload' : 'Cart Context',
      itemCount: finalItems.length,
      totalPay: orderpayload?.totalPay || orderpayload?.totals?.grandTotal || 0
    });
    console.groupEnd();
  }, [orderpayload, cart]);

  // Ensure email present
  if (orderpayload?.address && !orderpayload.address.email) {
    orderpayload.address.email =
      orderpayload?.user?.email || "noemail@placeholder.com";
  }

  // Prefill pickup details from user if available
  useEffect(() => {
    const nameGuess =
      orderpayload?.user?.name ||
      orderpayload?.address?.fullName ||
      orderpayload?.address?.name ||
      "";
    const phoneGuess = orderpayload?.user?.phone || orderpayload?.address?.phone || "";
    setPickupName(nameGuess);
    setPickupPhone(onlyDigits(phoneGuess).slice(-10));
  }, [orderpayload?.user, orderpayload?.address]);

  // Determine if B2B (Corporate/Bulk Order)
  const [minOrderQty, setMinOrderQty] = useState(100);
  
  // Load minimum order quantity from corporate settings
  useEffect(() => {
    const loadMinQty = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await fetch(`${API_BASE}/api/corporate-settings`);
        if (response.ok) {
          const result = await response.json();
          const settings = result.data || result;
          setMinOrderQty(settings.minOrderQuantity || 100);
        }
      } catch (error) {
        console.log('Using default minimum order quantity (100)');
      }
    };
    loadMinQty();
  }, []);

  const isB2B = useMemo(() => {
    const items = orderpayload?.items ?? cart ?? [];
    
    // Check if any item is marked as corporate
    const hasCorporateFlag = items.some((item) => item?.isCorporate === true);
    
    // Check if any item has bulk quantity (>= minimum order quantity)
    const itemsWithQuantity = items.map((item) => {
      const quantities = Object.values(item?.quantity ?? {});
      const totalQty = quantities.reduce((sum, qty) => sum + Number(qty || 0), 0);
      return {
        name: item?.products_name || item?.name || 'Unknown',
        totalQty,
        isBulk: totalQty >= minOrderQty,
        quantities: item?.quantity
      };
    });
    
    const hasBulkQuantity = itemsWithQuantity.some(item => item.isBulk);
    
    console.log('🔍 Payment Page - Order Type Detection:', {
      minOrderQty,
      hasCorporateFlag,
      hasBulkQuantity,
      itemsBreakdown: itemsWithQuantity,
      finalIsB2B: hasCorporateFlag || hasBulkQuantity
    });
    
    return hasCorporateFlag || hasBulkQuantity;
  }, [orderpayload, cart, minOrderQty]);

  // Dynamic payment options
  const paymentOptions = useMemo(() => {
    if (isB2B) {
      return [
        "50% Advance RazorPay", // ✅ Updated casing
        "Netbanking",
        "Pickup from Store",
        "Pay Online",
      ];
    }
    return ["Pay Online"];
  }, [isB2B]);

  // Calculate 50% amount for B2B orders
  const halfPayAmount = useMemo(() => {
    const displayTotal =
      orderpayload?.totalPayDisplay || orderpayload?.totals?.grandTotal || 0;

    if (displayTotal > 0) {
      return Math.ceil(displayTotal / 2);
    }

    const inrTotal = orderpayload?.totalPay || 0;
    if (inrTotal > 0 && toConvert && toConvert !== 1) {
      const convertedTotal = inrTotal * toConvert;
      console.log(
        "💱 PaymentPage: Converting totalPay",
        inrTotal,
        "INR ->",
        convertedTotal,
        "INR"
      );
      return Math.ceil(convertedTotal / 2);
    }

    return Math.ceil(inrTotal / 2);
  }, [orderpayload, toConvert]);

  // Calculate 50% amount in INR for Razorpay
  const halfPayAmountINR = useMemo(() => {
    const inrTotal = orderpayload?.totalPay || 0;
    const half = Math.ceil(inrTotal / 2);
    console.log("💰 PaymentPage halfPayAmountINR:", {
      totalPay: inrTotal,
      half,
    });
    return half;
  }, [orderpayload]);

  // Selecting method
  const handlePaymentChange = (method) => {
    if (
      (method === "Pickup from Store" || method.includes("50")) &&
      !isB2B
    ) {
      toast.error("This payment option is only available for B2B Corporate orders");
      return;
    }

    setPaymentMethod(method);

    setShowPayNow(
      method === "Pay Online" ||
        method.toLowerCase().includes("online") ||
        method === "50% Advance RazorPay" // ✅ Updated casing
    );

    setErrors({});
  };

  // Reset netbanking fields when payment method changes
  useEffect(() => {
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setIfsc("");
    setUtr("");

    setErrors({});
  }, [paymentMethod]);

  // Auto-fetch active bank details when Netbanking mode is selected
  useEffect(() => {
    if (paymentMethod !== "Netbanking") return;

    let mounted = true;

    const fetchBank = async () => {
      try {
        const bank = await getActiveBankDetails();
        if (!bank || !bank.bankdetails) {
          toast.error("Admin has not configured bank details yet");
          return;
        }

        if (mounted) {
          setBankName(bank.bankdetails.bankname || "");
          setAccountNumber(bank.bankdetails.accountnumber || "");
          setIfsc(bank.bankdetails.ifsccode || "");
          setAccountName(
            bank.bankdetails.accountname ||
              bank.upidetails?.upiname ||
              ""
          );
        }
      } catch (err) {
        console.error("❌ Failed to fetch bank details", err);
        toast.error("Failed to load bank details");
      }
    };

    fetchBank();
    return () => {
      mounted = false;
    };
  }, [paymentMethod]);

  /* ------------------------- validations & submit ------------------------- */

  const validateNetbanking = () => {
    const e = {};
    if (!bankName?.trim()) e.bankName = "Select bank";
    if (!accountName?.trim()) e.accountName = "Enter account holder name";

    const accDigits = onlyDigits(accountNumber);
    if (!(accDigits.length >= 9 && accDigits.length <= 18)) {
      e.accountNumber = "Enter a valid account number (9–18 digits)";
    }

    if (!validIFSC(ifsc)) {
      e.ifsc = "Enter valid IFSC (e.g., HDFC0001234)";
    }

    if (utr && !/^[A-Za-z0-9\-]{6,20}$/.test(utr)) {
      e.utr = "UTR looks invalid";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePickup = () => {
    const e = {};
    if (!pickupName?.trim()) e.pickupName = "Enter pickup name";
    if (!validPhone10(pickupPhone)) e.pickupPhone = "Enter 10-digit phone";
    if (!pickupWhen) e.pickupWhen = "Select pickup date & time";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const placeOrder = async (mode, successMsg, extraMeta = {}) => {
    try {
      console.log("🚀 placeOrder called with mode:", mode);
      console.log("📦 orderpayload structure:", {
        hasAddresses: !!orderpayload?.addresses,
        hasAddress: !!orderpayload?.address,
        addressesBilling: orderpayload?.addresses?.billing?.fullName,
        addressShippingFullName: orderpayload?.addresses?.shipping?.fullName,
        legacyAddressName: orderpayload?.address?.fullName,
        hasItems: !!orderpayload?.items,
        hasUser: !!orderpayload?.user
      });

      const paymentMeta = {
        mode,
        ...extraMeta,
      };

      let normalizedPayload = {
        ...orderpayload,

        // 🔥 BACKEND EXPECTS THIS
        paymentmode: mode,

        // keep meta separately
        paymentMeta,
      };

      if (orderpayload?.addresses) {
        console.log("✅ Using NEW addresses format");
        normalizedPayload.addresses = {
          billing: {
            fullName:
              orderpayload.addresses.billing?.fullName ||
              orderpayload.user?.name ||
              "",
            houseNumber: orderpayload.addresses.billing?.houseNumber || "",
            street: orderpayload.addresses.billing?.street || "",
            landmark: orderpayload.addresses.billing?.landmark || "",
            city: orderpayload.addresses.billing?.city || "",
            state: orderpayload.addresses.billing?.state || "",
            pincode: orderpayload.addresses.billing?.pincode || "",
            country: orderpayload.addresses.billing?.country || "India",
            email:
              orderpayload.addresses.billing?.email ||
              orderpayload.user?.email ||
              "notprovided@duco.com",
            phone:
              orderpayload.addresses.billing?.phone ||
              orderpayload.user?.phone ||
              "",
            gstNumber:
              orderpayload.gstNumber ||
              orderpayload.addresses.billing?.gstNumber ||
              "",
          },
          shipping: {
            fullName:
              orderpayload.addresses.shipping?.fullName ||
              orderpayload.user?.name ||
              "",
            houseNumber: orderpayload.addresses.shipping?.houseNumber || "",
            street: orderpayload.addresses.shipping?.street || "",
            landmark: orderpayload.addresses.shipping?.landmark || "",
            city: orderpayload.addresses.shipping?.city || "",
            state: orderpayload.addresses.shipping?.state || "",
            pincode: orderpayload.addresses.shipping?.pincode || "",
            country: orderpayload.addresses.shipping?.country || "India",
            email:
              orderpayload.addresses.shipping?.email ||
              orderpayload.user?.email ||
              "notprovided@duco.com",
            phone:
              orderpayload.addresses.shipping?.phone ||
              orderpayload.user?.phone ||
              "",
          },
          sameAsBilling: orderpayload.addresses.sameAsBilling ?? false,
        };
      } else if (orderpayload?.address) {
        console.log("✅ Using LEGACY address format");
        normalizedPayload.address = {
          fullName:
            orderpayload.address.fullName || orderpayload.user?.name || "",
          houseNumber: orderpayload.address.houseNumber || "",
          street: orderpayload.address.street || "",
          landmark: orderpayload.address.landmark || "",
          city: orderpayload.address.city || "",
          state: orderpayload.address.state || "",
          pincode: orderpayload.address.pincode || "",
          country: orderpayload.address.country || "India",
          email:
            orderpayload.address.email ||
            orderpayload.user?.email ||
            "notprovided@duco.com",
          phone:
            orderpayload.address.phone || orderpayload.user?.phone || "",
          gstNumber: orderpayload.gstNumber || orderpayload.address.gstNumber,
        };
      } else {
        console.warn("⚠️ NO ADDRESS DATA FOUND - neither addresses nor address present!");
        console.warn("This is why netbanking invoice shows wrong address!");
      }

      if (normalizedPayload.user && typeof normalizedPayload.user === "object") {
        normalizedPayload.user = normalizedPayload.user.id || normalizedPayload.user._id;
      }
      
      // ✅ Ensure user field exists (required by backend)
      if (!normalizedPayload.user) {
        console.error("❌ Missing user field in payload");
        normalizedPayload.user = orderpayload?.user?.id || orderpayload?.user?._id || orderpayload?.user;
      }

      if (!normalizedPayload.items || !Array.isArray(normalizedPayload.items)) {
        normalizedPayload.items = cart || [];
      }

      // ✅ Add pickup details to payload if pickup from store
      if (mode === "store_pickup" && paymentMeta?.pickup) {
        normalizedPayload.pickupDetails = {
          name: paymentMeta.pickup.name,
          phone: paymentMeta.pickup.phone,
          pickupAt: new Date(paymentMeta.pickup.at).toISOString(), // 🔥 Convert to ISO format
          notes: paymentMeta.pickup.notes || "",
        };
      }

      // ✅ Use null for all manual payment methods (netbanking, bank transfer, pickup, etc.)
      // This allows MongoDB to generate unique Order IDs instead of treating them as duplicates
      const paymentId = null;

      console.log("🚨 PAYMENT MODE SENT TO BACKEND:", mode);
      console.log("🧾 ORDER PAYLOAD", normalizedPayload);
      console.log("✅ FINAL PAYMENTMODE IN BODY:", normalizedPayload.paymentmode);
      console.log("📦 ITEMS BEING SENT:", JSON.stringify(normalizedPayload.items, null, 2));

      setIsProcessing(true);
      const res = await completeOrder(paymentId, normalizedPayload.paymentmode, normalizedPayload);
      const order = res?.order || res?.data?.order;
      const orderId = order?.id || order?._id;

      if (orderId) {
        localStorage.setItem("lastOrderId", orderId);
        localStorage.setItem("lastOrderMeta", JSON.stringify(paymentMeta));
      }

      if (orderId && normalizedPayload.items && Array.isArray(normalizedPayload.items)) {
        for (const item of normalizedPayload.items) {
          if (item.previewImages && Object.keys(item.previewImages).length > 0) {
            console.log("🖼 Uploading design images for item:", item.name);
            await uploadDesignImagesForOrder(orderId, item.previewImages);
          }
        }
      }

      toast.success(successMsg);

      if (orderId) {
        navigate(`/order-success/${orderId}`, {
          replace: true,
          state: { order, paymentMeta },
        });
      } else {
        navigate("/order-processing", {
          state: { order, paymentMeta },
        });
      }
    } catch (err) {
      setIsProcessing(false);
      console.error("❌ Order creation failed:", err);
      const errorMessage = err?.response?.data?.message || "Failed to place order";
      toast.error(errorMessage);
    }
  };

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (paymentMethod === "Pickup from Store") {
      if (!isB2B) {
        toast.error("Store Pickup is only available for B2B Corporate orders");
        return;
      }

      if (!validatePickup()) {
        toast.error("Please fix pickup details");
        return;
      }

      return placeOrder("store_pickup", "Pickup order placed successfully!", {
        pickup: {
          name: pickupName.trim(),
          phone: pickupPhone,
          at: pickupWhen,
          notes: pickupNotes?.trim() || "",
        },
      });
    }

    if (paymentMethod === "Netbanking" || paymentMethod === "netbanking") {
      if (!validateNetbanking()) {
        toast.error("Please fix netbanking details");
        return;
      }
      setShowNetModal(true);
      return;
    }

    if (paymentMethod === "50 Advance Bank Transfer") {
      if (!validateNetbanking()) {
        toast.error("Please fill in bank transfer details");
        return;
      }

      const meta = {
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumberMasked: maskAccount(onlyDigits(accountNumber)),
        ifsc: String(ifsc).toUpperCase(),
        utr: utr?.trim(),
        paymentType: "50advance",
        amountPaid: halfPayAmount,
        amountDue: halfPayAmount,
      };

      return placeOrder(
        "50",
        `50% advance ${currencySymbol}${halfPayAmount.toLocaleString()} order placed successfully!`,
        meta
      );
    }
  };

  const handleNetConfirm = async () => {
    setShowNetModal(false);

    const meta = {
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      accountNumberMasked: maskAccount(onlyDigits(accountNumber)),
      ifsc: String(ifsc).toUpperCase(),
      utr: utr?.trim(),
    };

    return placeOrder(
      "netbanking",
      "Netbanking order placed successfully!",
      meta
    );
  };

  const isBulkOrder = useMemo(() => {
    const items = orderpayload?.items ?? [];
    return items.some((item) =>
      Object.values(item?.quantity ?? {}).some((qty) => Number(qty) >= 50)
    );
  }, [orderpayload]);

  if (!cartLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A] text-white py-4 overflow-y-auto">
        <div className="my-auto">Loading payment details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0A0A0A] px-4 py-4 overflow-y-auto">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg relative my-auto">
        <h1 className="text-2xl font-semibold text-center text-[#0A0A0A] mb-6">
          Select Payment Method
        </h1>

        <div className="space-y-4">
          {paymentOptions.map((option) => (
            <div key={option}>
              <label className="flex items-start gap-3 text-lg text-[#0A0A0A]">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={option}
                  checked={paymentMethod === option}
                  onChange={() => handlePaymentChange(option)}
                  className="mt-1"
                />
                <div className="w-full">
                  <span className="font-semibold">{option}</span>

                  {/* Netbanking inline form */}
                  {option === "Netbanking" && paymentMethod === "Netbanking" && (
                    <div className="mt-3 space-y-3">
                      {/* BANK FIELDS */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Bank Name
                        </label>
                        <input
                          value={bankName}
                          readOnly
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                            errors.bankName ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.bankName && (
                          <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Account Holder Name
                        </label>
                        <input
                          value={accountName}
                          readOnly
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                            errors.accountName ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.accountName && (
                          <p className="text-xs text-red-600 mt-1">{errors.accountName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Account Number
                        </label>
                        <input
                          value={accountNumber}
                          readOnly
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                            errors.accountNumber ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.accountNumber && (
                          <p className="text-xs text-red-600 mt-1">{errors.accountNumber}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          IFSC Code
                        </label>
                        <input
                          value={ifsc}
                          readOnly
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                            errors.ifsc ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.ifsc && (
                          <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          UTR / Reference (optional)
                        </label>
                        <input
                          value={utr}
                          onChange={(e) => setUtr(e.target.value)}
                          placeholder="If already paid, enter UTR"
                          className="w-full rounded-lg border px-3 py-2 text-sm border-gray-300"
                        />
                      </div>
                    </div>
                  )}

                  {/* 50 Advance Bank Transfer inline form */}
                  {option === "50 Advance Bank Transfer" &&
                    paymentMethod === "50 Advance Bank Transfer" && (
                      <div className="mt-3 space-y-3">
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800 font-medium">
                            50% Advance Payment: {currencySymbol}
                            {halfPayAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Remaining {currencySymbol}
                            {halfPayAmount.toLocaleString()} will be due before
                            delivery.
                          </p>
                        </div>

                        {/* BANK FIELDS */}
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Bank Name
                          </label>
                          <input
                            value={bankName}
                            readOnly
                            className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                              errors.bankName ? "border-red-500" : "border-gray-300"
                            }`}
                          />
                          {errors.bankName && (
                            <p className="text-xs text-red-600 mt-1">{errors.bankName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Account Holder Name
                          </label>
                          <input
                            value={accountName}
                            readOnly
                            className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                              errors.accountName ? "border-red-500" : "border-gray-300"
                            }`}
                          />
                          {errors.accountName && (
                            <p className="text-xs text-red-600 mt-1">{errors.accountName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Account Number
                          </label>
                          <input
                            value={accountNumber}
                            readOnly
                            className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                              errors.accountNumber ? "border-red-500" : "border-gray-300"
                            }`}
                          />
                          {errors.accountNumber && (
                            <p className="text-xs text-red-600 mt-1">{errors.accountNumber}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            IFSC Code
                          </label>
                          <input
                            value={ifsc}
                            readOnly
                            className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                              errors.ifsc ? "border-red-500" : "border-gray-300"
                            }`}
                          />
                          {errors.ifsc && (
                            <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            UTR / Reference (optional)
                          </label>
                          <input
                            value={utr}
                            onChange={(e) => setUtr(e.target.value)}
                            placeholder="If already paid, enter UTR"
                            className="w-full rounded-lg border px-3 py-2 text-sm border-gray-300"
                          />
                        </div>
                      </div>
                    )}

                  {/* Pickup inline form */}
                  {option === "Pickup from Store" &&
                    paymentMethod === "Pickup from Store" && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Pickup Name
                          </label>
                          <input
                            value={pickupName}
                            onChange={(e) => setPickupName(e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              errors.pickupName
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.pickupName && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors.pickupName}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Phone (10 digits)
                          </label>
                          <input
                            inputMode="numeric"
                            value={pickupPhone}
                            onChange={(e) =>
                              setPickupPhone(
                                onlyDigits(e.target.value).slice(0, 10)
                              )
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              errors.pickupPhone
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.pickupPhone && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors.pickupPhone}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Pickup Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={pickupWhen}
                            onChange={(e) => setPickupWhen(e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              errors.pickupWhen
                                ? "border-red-500"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.pickupWhen && (
                            <p className="text-xs text-red-600 mt-1">
                              {errors.pickupWhen}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Notes (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={pickupNotes}
                            onChange={(e) => setPickupNotes(e.target.value)}
                            className="w-full rounded-lg border px-3 py-2 text-sm border-gray-300"
                          />
                        </div>
                      </div>
                    )}
                </div>
              </label>
            </div>
          ))}

          {/* ✅ UPDATED CASE: 50% Advance RazorPay */}
          {showPayNow && paymentMethod === "50% Advance RazorPay" && (
            <div className="mt-6 space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  50% Advance Payment: {currencySymbol}
                  {halfPayAmount.toLocaleString()}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Remaining {currencySymbol}
                  {halfPayAmount.toLocaleString()} will be due before delivery.
                </p>
              </div>

              <PaymentButton
                orderData={{
                  ...orderpayload,
                  items:
                    orderpayload?.items?.length > 0
                      ? orderpayload.items
                      : cart || [],
                  totalPay: halfPayAmountINR,
                  totalPayDisplay: halfPayAmount,
                  displayCurrency: currency,
                  originalTotal:
                    orderpayload?.totalPay ||
                    orderpayload?.totals?.grandTotal ||
                    0,
                  isHalfPayment: true,
                  paymentType: "50",
                }}
              />
            </div>
          )}

          {showPayNow &&
            paymentMethod.toLowerCase().includes("online") &&
            paymentMethod !== "50% Advance RazorPay" && (
              <div className="mt-6 space-y-3">
                {import.meta.env.MODE !== "production" && (
                  <button
                    onClick={() => {
                      console.group("🧪 ORDER PAYLOAD PREVIEW BEFORE PAYMENT");
                      console.log("💳 Payment mode:", paymentMethod);

                      const localCart = JSON.parse(localStorage.getItem("cart") || "[]");
                      const itemsSource =
                        (cart && cart.length > 0 && cart) ||
                        (localCart && localCart.length > 0 && localCart) ||
                        orderpayload?.items ||
                        [];

                      console.log(
                        "📦 Using items from:",
                        cart && cart.length > 0
                          ? "CartContext"
                          : localCart && localCart.length > 0
                          ? "LocalStorage"
                          : "OrderPayload"
                      );

                      const orderPayload = {
                        items: itemsSource.map((item, idx) => {
                          const missing = [];
                          if (!item.printroveProductId)
                            missing.push("printroveProductId");
                          if (!item.printroveVariantId)
                            missing.push("printroveVariantId");
                          if (!item.previewImages?.front)
                            missing.push("previewImages.front");

                          if (missing.length > 0) {
                            console.warn(
                              `⚠️ Item #${idx + 1} Missing:`,
                              missing.join(", ")
                            );
                          }

                          return {
                            id: item.id,
                            productId: item.productId || item.id,
                            name:
                              item.products_name ||
                              item.name ||
                              "Custom T-shirt",
                            printroveProductId: item.printroveProductId || null,
                            printroveVariantId: item.printroveVariantId || null,
                            color: item.color,
                            gender: item.gender,
                            price: item.price,
                            quantity: item.quantity,
                            previewImages: {
                              front: item.previewImages?.front || null,
                              back: item.previewImages?.back || null,
                              left: item.previewImages?.left || null,
                              right: item.previewImages?.right || null,
                            },
                            design: item.design || {},
                          };
                        }),
                        address: {
                          name:
                            orderpayload?.address?.fullName ||
                            orderpayload?.address?.name ||
                            "Unknown",
                          phone: orderpayload?.address?.phone || "",
                          email: orderpayload?.address?.email || "",
                          street: orderpayload?.address?.street || "",
                          city: orderpayload?.address?.city || "",
                          state: orderpayload?.address?.state || "",
                          postalCode: orderpayload?.address?.pincode || "",
                          country: orderpayload?.address?.country || "India",
                          houseNumber:
                            orderpayload?.address?.houseNumber || "NA",
                        },
                        user: orderpayload?.user || {},
                        paymentmode: paymentMethod || "online",
                        totalPay:
                          orderpayload?.totalPay ||
                          orderpayload?.totals?.grandTotal ||
                          0,
                      };

                      console.log(JSON.stringify(orderPayload, null, 2));

                      const issues = [];
                      orderPayload.items.forEach((item, idx) => {
                        if (!item.printroveProductId)
                          issues.push(
                            `Item #${idx + 1} Missing printroveProductId`
                          );
                        if (!item.printroveVariantId)
                          issues.push(
                            `Item #${idx + 1} Missing printroveVariantId`
                          );
                        if (!item.previewImages?.front)
                          issues.push(
                            `Item #${idx + 1} Missing previewImages.front`
                          );
                      });

                      if (issues.length > 0) {
                        console.warn("⚠️ Found issues:", issues);
                        alert(`${issues.length} issues found. Check console.`);
                      } else {
                        console.log("✅ All required fields look good!");
                        alert("Everything looks perfect!");
                      }

                      console.groupEnd();
                    }}
                    className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"
                  >
                    Preview Order Payload (Console)
                  </button>
                )}

                <PaymentButton
                  orderData={{
                    ...orderpayload,
                    items:
                      orderpayload?.items?.length > 0
                        ? orderpayload.items
                        : cart || [],
                    totalPay:
                      orderpayload?.totalPay ||
                      orderpayload?.totals?.grandTotal ||
                      0,
                  }}
                />
              </div>
            )}

          {!showPayNow &&
            (paymentMethod === "Netbanking" ||
              paymentMethod === "Pickup from Store" ||
              paymentMethod === "50 Advance Bank Transfer") && (
              <button
                onClick={handleSubmit}
                className="w-full mt-6 py-2 px-4 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] font-semibold"
              >
                {paymentMethod === "50 Advance Bank Transfer"
                  ? `Pay 50% Advance (${currencySymbol}${halfPayAmount.toLocaleString()})`
                  : "Continue"}
              </button>
            )}
        </div>

        <div className="mt-8 p-3 bg-gray-50 border rounded text-sm text-gray-700">
          <div>
            Order Type: {isB2B ? "Corporate/Bulk Order (B2B)" : "Retail (B2C)"}
          </div>
          <div>Available Payment Options: {paymentOptions.join(", ")}</div>
          {isB2B && (
            <div className="mt-2 text-xs text-green-700">
              Bulk order detected - Additional payment methods available.
            </div>
          )}
        </div>

        {showNetModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
              <h2 className="text-lg font-semibold mb-3 text-center">
                Confirm Netbanking Payment
              </h2>

              <div className="text-sm text-gray-800 space-y-1 mb-4">
                <div>
                  <b>Bank:</b> {bankName || "-"}
                </div>
                <div>
                  <b>Account Name:</b> {accountName || "-"}
                </div>
                <div>
                  <b>Account No.:</b> {maskAccount(onlyDigits(accountNumber)) || "-"}
                </div>
                <div>
                  <b>IFSC:</b> {String(ifsc).toUpperCase() || "-"}
                </div>
                <div>
                  <b>UTR:</b> {utr || "-"}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 text-center">
                Please ensure your transfer is completed. Click confirm to place
                your order and generate the invoice.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleNetConfirm}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  Confirm Payment
                </button>
                <button
                  onClick={() => setShowNetModal(false)}
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ PROCESSING OVERLAY */}
        {isProcessing && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
              <div className="mb-6 flex justify-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-2 bg-white rounded-full"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "120ms" }}></span>
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "240ms" }}></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;