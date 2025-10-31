import React, { useState, useMemo, useEffect, useContext } from "react";
import PaymentButton from "../Components/PaymentButton";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NetbankingPanel from "../Components/NetbankingPanel.jsx";
import { completeOrder } from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext.jsx";

/* ------------------------------ helpers ------------------------------ */
const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
const maskAccount = (acc = "") =>
  acc ? `${"*".repeat(Math.max(0, acc.length - 4))}${acc.slice(-4)}` : acc;
const validIFSC = (s = "") => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(s).toUpperCase());
const validUPI = (s = "") =>
  /^[\w.\-_]{2,}@[\w\-]{2,}$/i.test(String(s).trim());
const validPhone10 = (s = "") => /^\d{10}$/.test(onlyDigits(s));

/* -------------------------------- Page -------------------------------- */
const PaymentPage = () => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPayNow, setShowPayNow] = useState(false);
  const [netbankingType, setNetbankingType] = useState("bank"); // ✅ default to "bank"
  const [showNetModal, setShowNetModal] = useState(false);

  // Netbanking (BANK) fields
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [utr, setUtr] = useState("");

  // Netbanking (UPI) fields
  const [upiId, setUpiId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [upiRef, setUpiRef] = useState("");

  // Pickup from store fields
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [pickupWhen, setPickupWhen] = useState(""); // datetime-local
  const [pickupNotes, setPickupNotes] = useState("");

  const [errors, setErrors] = useState({});

  const locations = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();

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

  // Determine if B2B
  const isB2B = useMemo(() => {
    const items = orderpayload?.items ?? cart ?? [];
    return items.some((item) => item?.isCorporate === true);
  }, [orderpayload, cart]);

  // Dynamic payment options
  const paymentOptions = useMemo(() => {
    if (isB2B) {
      return ["Netbanking", "Pickup from Store", "Pay Online"];
    } else {
      return ["Pay Online"];
    }
  }, [isB2B]);

  // Selecting method
  const handlePaymentChange = (method) => {
    setPaymentMethod(method);
    setShowPayNow(
      method === "Pay Online" || method === "online" || method === "50%"
    );
    // Reset errors when method changes
    setErrors({});
  };

  /* ------------------------- validations & submit ------------------------- */
  const validateNetbanking = () => {
    const e = {};
    if (netbankingType === "bank") {
      if (!bankName?.trim()) e.bankName = "Select bank";
      if (!accountName?.trim()) e.accountName = "Enter account holder name";
      const accDigits = onlyDigits(accountNumber);
      if (!(accDigits.length >= 9 && accDigits.length <= 18))
        e.accountNumber = "Enter a valid account number (9–18 digits)";
      if (!validIFSC(ifsc)) e.ifsc = "Enter valid IFSC (e.g., HDFC0001234)";
      // UTR optional but good:
      if (utr && !/^[A-Za-z0-9]{6,}$/.test(utr))
        e.utr = "UTR looks invalid";
    } else {
      // UPI
      if (!validUPI(upiId)) e.upiId = "Enter valid UPI ID (e.g., name@bank)";
      if (!payerName?.trim()) e.payerName = "Enter payer name";
      if (upiRef && !/^[A-Za-z0-9]{6,}$/.test(upiRef))
        e.upiRef = "Reference/UTR looks invalid";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePickup = () => {
    const e = {};
    if (!pickupName?.trim()) e.pickupName = "Enter pickup name";
    if (!validPhone10(pickupPhone)) e.pickupPhone = "Enter 10-digit phone";
    if (!pickupWhen) e.pickupWhen = "Select pickup date/time";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Common Order Creator for Manual Payments (now accepts extraMeta)
  const placeOrder = async (mode, successMsg, extraMeta = {}) => {
    try {
      const paymentMeta = { mode, ...extraMeta };
      const payloadToSend = {
        ...orderpayload,
        paymentMeta,
      };

      const res = await completeOrder("manual_payment", mode, payloadToSend);

      const order = res?.order || res?.data?.order || {};
      const orderId = order?._id || "";

      // persist for refresh / deep-link
      if (orderId) localStorage.setItem("lastOrderId", orderId);
      localStorage.setItem("lastOrderMeta", JSON.stringify(paymentMeta));

      toast.success(`✅ ${successMsg}`);

      // redirect to your existing success page
      navigate(`/order-processing${orderId ? `?orderId=${orderId}` : ""}`, {
        state: { order, paymentMeta },
      });
    } catch (err) {
      console.error("Order creation failed:", err);
      toast.error("❌ Failed to place order");
    }
  };

  // Handle Manual (non-Razorpay) payments
  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Pickup from Store → validate inline, then place order
    if (paymentMethod === "Pickup from Store") {
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

    // Netbanking → validate inline, then open confirm modal
    if (paymentMethod === "Netbanking" || paymentMethod === "netbanking") {
      if (!validateNetbanking()) {
        toast.error("Please fix netbanking details");
        return;
      }
      setShowNetModal(true);
      return;
    }

    // 50% payment (if you keep this path)
    if (paymentMethod === "50%" || paymentMethod === "half_payment") {
      return placeOrder("half_payment", "50% advance order placed successfully!");
    }
  };

  // Confirm Netbanking flow (modal confirm)
  const handleNetConfirm = async () => {
    setShowNetModal(false);
    const meta =
      netbankingType === "bank"
        ? {
            netbankingType,
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNumberMasked: maskAccount(onlyDigits(accountNumber)),
            ifsc: String(ifsc).toUpperCase(),
            utr: utr?.trim() || "",
          }
        : {
            netbankingType,
            upiId: upiId.trim(),
            payerName: payerName.trim(),
            reference: upiRef?.trim() || "",
          };

    return placeOrder("netbanking", "Netbanking order placed successfully!", meta);
  };

  // detect bulk order (unchanged)
  const isBulkOrder = useMemo(() => {
    const items = orderpayload?.items ?? [];
    return items.some((item) =>
      Object.values(item?.quantity ?? {}).some((qty) => Number(qty) >= 50)
    );
  }, [orderpayload]);

  /* -------------------------------- render -------------------------------- */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg relative">
        <h1 className="text-2xl font-semibold text-center text-[#0A0A0A] mb-6">
          Select Payment Method
        </h1>

        <div className="space-y-4">
          {/* 💡 Dynamic Rendering Based on B2B or B2C */}
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

                  {/* 🏦 Netbanking inline form */}
                  {option === "Netbanking" &&
                    paymentMethod === "Netbanking" && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Pay via:</span>
                          <select
                            value={netbankingType}
                            onChange={(e) => {
                              setNetbankingType(e.target.value);
                              setErrors({});
                            }}
                            className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                          >
                            <option value="bank">Bank Transfer (NEFT/IMPS/RTGS)</option>
                            <option value="upi">UPI</option>
                          </select>
                        </div>

                        {/* BANK FIELDS */}
                        {netbankingType === "bank" && (
                          <>
                            {/* bank name search */}
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Bank Name
                              </label>
                              <input
                                list="bank-list"
                                placeholder="Start typing your bank (e.g., HDFC Bank)"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                  errors.bankName ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              <datalist id="bank-list">
                                {[
                                  "HDFC Bank",
                                  "ICICI Bank",
                                  "State Bank of India",
                                  "Axis Bank",
                                  "Kotak Mahindra Bank",
                                  "Yes Bank",
                                  "Punjab National Bank",
                                  "Bank of Baroda",
                                  "IDFC FIRST Bank",
                                  "Union Bank of India",
                                ].map((b) => (
                                  <option key={b} value={b} />
                                ))}
                              </datalist>
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
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="As per bank records"
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                  errors.accountName
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              />
                              {errors.accountName && (
                                <p className="text-xs text-red-600 mt-1">
                                  {errors.accountName}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Account Number
                              </label>
                              <input
                                inputMode="numeric"
                                value={accountNumber}
                                onChange={(e) =>
                                  setAccountNumber(onlyDigits(e.target.value).slice(0, 18))
                                }
                                placeholder="9–18 digits"
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                  errors.accountNumber
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                              />
                              {errors.accountNumber && (
                                <p className="text-xs text-red-600 mt-1">
                                  {errors.accountNumber}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                IFSC Code
                              </label>
                              <input
                                value={ifsc}
                                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                                placeholder="e.g., HDFC0001234"
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
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
                          </>
                        )}

                        {/* UPI FIELDS */}
                        {netbankingType === "upi" && (
                          <>
                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                UPI ID
                              </label>
                              <input
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                placeholder="name@bank"
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                  errors.upiId ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {errors.upiId && (
                                <p className="text-xs text-red-600 mt-1">{errors.upiId}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Payer Name
                              </label>
                              <input
                                value={payerName}
                                onChange={(e) => setPayerName(e.target.value)}
                                placeholder="Your name on UPI"
                                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                                  errors.payerName ? "border-red-500" : "border-gray-300"
                                }`}
                              />
                              {errors.payerName && (
                                <p className="text-xs text-red-600 mt-1">
                                  {errors.payerName}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm text-gray-600 mb-1">
                                Reference / UTR (optional)
                              </label>
                              <input
                                value={upiRef}
                                onChange={(e) => setUpiRef(e.target.value)}
                                placeholder="If already paid, enter UTR"
                                className={`w-full rounded-lg border px-3 py-2 text-sm border-gray-300`}
                              />
                            </div>
                          </>
                        )}

                        {/* (Optional) Your existing panel still renders */}
                        <NetbankingPanel
                          paymentMethod={paymentMethod}
                          netbankingType={netbankingType}
                        />
                      </div>
                    )}

                  {/* 🏬 Pickup inline form */}
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
                              errors.pickupName ? "border-red-500" : "border-gray-300"
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
                              setPickupPhone(onlyDigits(e.target.value).slice(0, 10))
                            }
                            className={`w-full rounded-lg border px-3 py-2 text-sm ${
                              errors.pickupPhone ? "border-red-500" : "border-gray-300"
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
                              errors.pickupWhen ? "border-red-500" : "border-gray-300"
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

          {/* ✅ Razorpay button for Pay Online (unchanged) */}
          {showPayNow && paymentMethod.toLowerCase().includes("online") && (
            <div className="mt-6 space-y-3">
              {import.meta.env.MODE !== "production" && (
                <button
                  onClick={() => {
                    console.group("🧾 ORDER PAYLOAD PREVIEW BEFORE PAYMENT");
                    console.log("🔹 Payment mode:", paymentMethod);

                    const localCart = JSON.parse(localStorage.getItem("cart")) || [];
                    const itemsSource =
                      cart?.length > 0
                        ? cart
                        : localCart.length > 0
                        ? localCart
                        : orderpayload?.items || [];

                    console.log(
                      "🧩 Using items from:",
                      cart?.length > 0
                        ? "CartContext"
                        : localCart.length > 0
                        ? "LocalStorage"
                        : "OrderPayload"
                    );

                    const orderPayload = {
                      items: itemsSource.map((item, idx) => {
                        const missing = [];
                        if (!item.printroveProductId) missing.push("printroveProductId");
                        if (!item.printroveVariantId) missing.push("printroveVariantId");
                        if (!item.previewImages?.front) missing.push("previewImages.front");

                        if (missing.length > 0) {
                          console.warn(
                            `⚠ Item ${idx + 1}: Missing ${missing.join(", ")}`
                          );
                        }

                        return {
                          id: item.id,
                          productId: item.productId || item._id,
                          name: item.products_name || item.name || "Custom T-shirt",
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
                        name: orderpayload?.address?.fullName || "Unknown",
                        phone: orderpayload?.address?.phone || "",
                        email: orderpayload?.address?.email || "",
                        street: orderpayload?.address?.street || "",
                        city: orderpayload?.address?.city || "",
                        state: orderpayload?.address?.state || "",
                        postalCode: orderpayload?.address?.pincode || "",
                        country: orderpayload?.address?.country || "India",
                        houseNumber: orderpayload?.address?.houseNumber || "N/A",
                      },

                      user: orderpayload?.user || {},
                      paymentmode: paymentMethod || "online",
                      totalPay: orderpayload?.totalPay || 0,
                    };

                    console.log(JSON.stringify(orderPayload, null, 2));

                    const issues = [];
                    orderPayload.items.forEach((item, idx) => {
                      if (!item.printroveProductId)
                        issues.push(`❌ Item ${idx + 1}: Missing printroveProductId`);
                      if (!item.printroveVariantId)
                        issues.push(`❌ Item ${idx + 1}: Missing printroveVariantId`);
                      if (!item.previewImages?.front)
                        issues.push(`⚠️ Item ${idx + 1}: Missing previewImages.front`);
                    });

                    if (issues.length > 0) {
                      console.warn("⚠️ Found issues:", issues);
                      alert(`⚠️ ${issues.length} issue(s) found. Check console.`);
                    } else {
                      console.log("✅ All required fields look good!");
                      alert("✅ Everything looks perfect!");
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
                  items: orderpayload?.items?.length > 0 ? orderpayload.items : cart || [],
                  totalPay: orderpayload?.totalPay || orderpayload?.totals?.grandTotal || 0,
                }}
              />
            </div>
          )}

          {/* ✅ For manual methods → Continue */}
          {!showPayNow &&
            (paymentMethod === "Netbanking" ||
              paymentMethod === "Pickup from Store" ||
              paymentMethod === "50%") && (
              <button
                onClick={handleSubmit}
                className="w-full mt-6 py-2 px-4 bg-[#E5C870] text-black rounded-lg hover:bg-[#D4B752] font-semibold"
              >
                Continue
              </button>
            )}
        </div>

        {/* Debug Info */}
        <div className="mt-8 p-3 bg-gray-50 border rounded text-sm text-gray-700">
          <div>Order Type: {isB2B ? "Corporate (B2B)" : "Retail (B2C)"}</div>
          <div>Available Options: {paymentOptions.join(", ")}</div>
        </div>

        {/* 🪟 Netbanking Confirmation Modal */}
        {showNetModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
              <h2 className="text-lg font-semibold mb-3 text-center">
                Confirm Netbanking Payment
              </h2>

              {netbankingType === "bank" ? (
                <div className="text-sm text-gray-800 space-y-1 mb-4">
                  <div>
                    <b>Bank:</b> {bankName || "-"}
                  </div>
                  <div>
                    <b>Account Name:</b> {accountName || "-"}
                  </div>
                  <div>
                    <b>Account No.:</b> {maskAccount(onlyDigits(accountNumber))}
                  </div>
                  <div>
                    <b>IFSC:</b> {String(ifsc).toUpperCase() || "-"}
                  </div>
                  {utr && (
                    <div>
                      <b>UTR:</b> {utr}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-800 space-y-1 mb-4">
                  <div>
                    <b>UPI ID:</b> {upiId || "-"}
                  </div>
                  <div>
                    <b>Payer Name:</b> {payerName || "-"}
                  </div>
                  {upiRef && (
                    <div>
                      <b>Reference/UTR:</b> {upiRef}
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4 text-center">
                Please ensure your transfer is completed. Click confirm to place your
                order and generate the invoice.
              </p>

              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleNetConfirm}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  ✅ Confirm Payment
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
      </div>
    </div>
  );
};

/* ---------------- optional little UI rows (unchanged) ---------------- */
function DetailRow({ label, value, canCopy }) {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <div className="text-sm">
        <div className="text-gray-500">{label}</div>
        <div className="font-medium text-[#0A0A0A]">{value}</div>
      </div>
      {canCopy && (
        <button
          type="button"
          onClick={copy}
          className="ml-3 rounded-lg border px-2 py-1 text-xs hover:bg-[#E5C870] hover:text-black"
          title="Copy"
        >
          Copy
        </button>
      )}
    </div>
  );
}

function CopyRow({ label, value }) {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <div className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-2">
      <div>
        <div className="text-gray-500">{label}</div>
        <div className="font-medium text-[#0A0A0A]">{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="ml-3 rounded-lg border px-2 py-1 text-xs hover:bg-[#E5C870] hover:text-black"
        title="Copy"
      >
        Copy
      </button>
    </div>
  );
}

export default PaymentPage;
