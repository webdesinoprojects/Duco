import React, { useState, useMemo, useEffect, useContext } from "react";
import PaymentButton from "../Components/PaymentButton";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NetbankingPanel from "../Components/NetbankingPanel.jsx";
import { completeOrder } from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext.jsx";

const PaymentPage = () => {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showPayNow, setShowPayNow] = useState(false);
  const [netbankingType, setNetbankingType] = useState("");
  const [showNetModal, setShowNetModal] = useState(false); // ✅ new modal state
  const locations = useLocation();
  const navigate = useNavigate();
  const { cart } = useCart();

  const [cartLoaded, setCartLoaded] = useState(false);

  // ✅ Load fallback cart if needed
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart"));
    if (savedCart && savedCart.length > 0) {
      console.log("🛒 Using localStorage cart as fallback:", savedCart);
    }
    setCartLoaded(true);
  }, []);

  const orderpayload = locations.state || {};

  // ✅ Debug log order payload
  useEffect(() => {
    if (!orderpayload) return;

    console.group("🧾 AUTO ORDER PAYLOAD PREVIEW");
    console.log("📦 Full order payload that will be sent to backend:");
    console.log(JSON.stringify(orderpayload, null, 2));

    const summary = {
      user: orderpayload?.user?._id || "❌ Missing",
      address: orderpayload?.address?.fullName || "❌ Missing",
      itemCount: orderpayload?.items?.length || 0,
      totalPay: orderpayload?.totalPay || 0,
    };
    console.table(summary);
    console.groupEnd();
  }, [orderpayload]);

  // ✅ Ensure email present
  if (orderpayload?.address && !orderpayload.address.email) {
    orderpayload.address.email =
      orderpayload?.user?.email || "noemail@placeholder.com";
  }

  // ✅ Determine if B2B (Corporate)
  const isB2B = useMemo(() => {
    const items = orderpayload?.items ?? cart ?? [];
    return items.some((item) => item?.isCorporate === true);
  }, [orderpayload, cart]);

  // ✅ Dynamic payment options
  const paymentOptions = useMemo(() => {
    if (isB2B) {
      return ["Netbanking", "Pickup from Store", "Pay Online"];
    } else {
      return ["Pay Online"];
    }
  }, [isB2B]);

  // ✅ When selecting method
  const handlePaymentChange = (method) => {
    setPaymentMethod(method);
    setShowPayNow(
      method === "Pay Online" || method === "online" || method === "50%"
    );
  };

  // ✅ Common Order Creator for Manual Payments
  const placeOrder = async (mode, successMsg) => {
    try {
      const res = await completeOrder("manual_payment", mode, orderpayload);
      toast.success(`✅ ${successMsg}`);
      navigate("/order-success", { state: { order: res.order } });
    } catch (err) {
      console.error("Order creation failed:", err);
      toast.error("❌ Failed to place order");
    }
  };

  // ✅ Handle Manual (non-Razorpay) payments
  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // 🏬 Pickup from Store
    if (paymentMethod === "Pickup from Store") {
      return placeOrder("store_pickup", "Pickup order placed successfully!");
    }

    // 🏦 Netbanking (open modal first)
    if (paymentMethod === "Netbanking" || paymentMethod === "netbanking") {
      setShowNetModal(true);
      return;
    }

    // 💰 50% payment
    if (paymentMethod === "50%" || paymentMethod === "half_payment") {
      const res = await completeOrder("half_payment", "50%", orderpayload);
      toast.success("✅ 50% advance order placed successfully!");
      navigate("/order-success", { state: { order: res.order } });
    }
  };

  // ✅ Confirm Netbanking flow
  const handleNetConfirm = async () => {
    setShowNetModal(false);
    return placeOrder("netbanking", "Netbanking order placed successfully!");
  };

  // ✅ detect bulk order
  const isBulkOrder = useMemo(() => {
    const items = orderpayload?.items ?? [];
    return items.some((item) =>
      Object.values(item?.quantity ?? {}).some((qty) => Number(qty) >= 50)
    );
  }, [orderpayload]);

  // ✅ FIX: Ensure totalPay is calculated properly
  const itemsSource =
    cart?.length > 0
      ? cart
      : orderpayload?.items && orderpayload.items.length > 0
      ? orderpayload.items
      : [];

  const calculatedTotalPay = itemsSource.reduce((sum, item) => {
    const qty =
      typeof item.quantity === "number"
        ? item.quantity
        : Object.values(item.quantity || {}).reduce(
            (a, b) => a + Number(b || 0),
            0
          );
    return sum + (item.price || 0) * qty;
  }, 0);

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

                  {/* For Netbanking */}
                  {option === "Netbanking" &&
                    paymentMethod === "Netbanking" && (
                      <div className="mt-3">
                        <select
                          value={netbankingType}
                          onChange={(e) => setNetbankingType(e.target.value)}
                          className="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#E5C870]"
                        >
                          <option value="upi">UPI</option>
                          <option value="bank">Account Details</option>
                        </select>

                        <NetbankingPanel
                          paymentMethod={paymentMethod}
                          netbankingType={netbankingType}
                        />
                      </div>
                    )}
                </div>
              </label>
            </div>
          ))}

          {/* ✅ Razorpay button for Pay Online */}
          {showPayNow && paymentMethod.toLowerCase().includes("online") && (
            <div className="mt-6 space-y-3">
              {/* Debug Preview Button (Dev Only) */}
              {import.meta.env.MODE !== "production" && (
                <button
                  onClick={() => {
                    console.group("🧾 ORDER PAYLOAD PREVIEW BEFORE PAYMENT");
                    console.log("🔹 Payment mode:", paymentMethod);

                    const localCart =
                      JSON.parse(localStorage.getItem("cart")) || [];
                    const itemsSource =
                      cart?.length > 0
                        ? cart
                        : orderpayload?.items && orderpayload.items.length > 0
                        ? orderpayload.items
                        : [];

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
                        // ✅ Printrove mapping is now handled by backend
                        // No need to validate printroveProductId/printroveVariantId in frontend

                        const missing = [];
                        if (!item.previewImages?.front)
                          missing.push("previewImages.front");

                        if (missing.length > 0) {
                          console.warn(
                            `⚠ Item ${idx + 1}: Missing ${missing.join(
                              ", "
                            )} - Using fallback values for testing`
                          );
                        }

                        return {
                          id: item.id,
                          productId: item.productId || item._id,
                          name:
                            item.products_name || item.name || "Custom T-shirt",
                          // ✅ Printrove mapping handled by backend - no need to send these fields
                          color: item.color,
                          gender: item.gender,
                          price: item.price,
                          quantity: item.quantity,
                          previewImages: {
                            front:
                              item.previewImages?.front ||
                              item.image_url?.[0]?.url?.[0] ||
                              "/fallback.png",
                            back: item.previewImages?.back || null,
                            left: item.previewImages?.left || null,
                            right: item.previewImages?.right || null,
                          },
                          design: item.design || {},
                        };
                      }),
                      address: {
                        name: orderpayload?.address?.fullName || "Unknown",
                        phone: orderpayload?.address?.mobileNumber || orderpayload?.address?.phone || "", // ✅ Extract from mobileNumber (saved field)
                        email: orderpayload?.address?.email || "",
                        street: orderpayload?.address?.street || "",
                        city: orderpayload?.address?.city || "",
                        state: orderpayload?.address?.state || "",
                        postalCode: orderpayload?.address?.pincode || "",
                        country: orderpayload?.address?.country || "India",
                        houseNumber:
                          orderpayload?.address?.houseNumber || "N/A",
                      },

                      user: orderpayload?.user || {},
                      paymentmode: paymentMethod || "online",
                      totalPay: orderpayload?.totalPay || 0,
                    };

                    console.log(JSON.stringify(orderPayload, null, 2));

                    const issues = [];
                    orderPayload.items.forEach((item, idx) => {
                      // Only check for critical missing fields, not fallback values
                      if (!item.id)
                        issues.push(`❌ Item ${idx + 1}: Missing item ID`);
                      if (!item.price || item.price <= 0)
                        issues.push(`❌ Item ${idx + 1}: Invalid price`);
                      if (
                        !item.quantity ||
                        Object.values(item.quantity || {}).every(
                          (qty) => qty <= 0
                        )
                      )
                        issues.push(
                          `❌ Item ${idx + 1}: No quantity specified`
                        );
                    });

                    if (issues.length > 0) {
                      console.warn("⚠️ Found critical issues:", issues);
                      alert(
                        `⚠️ ${issues.length} critical issue(s) found. Check console.`
                      );
                    } else {
                      console.log(
                        "✅ All critical fields look good! (Using fallback values for Printrove fields)"
                      );
                      alert(
                        "✅ Payment ready! Using fallback values for testing."
                      );
                    }

                    console.groupEnd();
                  }}
                  className="w-full py-2 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold"
                >
                  Preview Order Payload (Console)
                </button>
              )}

              {/* Razorpay Actual Button */}
              <PaymentButton
                orderData={{
                  ...orderpayload,
                  items: itemsSource,
                  totalPay: calculatedTotalPay, // ✅ FIXED here
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

        {/* ⚙️ Debug Info */}
        <div className="mt-8 p-3 bg-gray-50 border rounded text-sm text-gray-700">
          <div>Order Type: {isB2B ? "Corporate (B2B)" : "Retail (B2C)"}</div>
          <div>Available Options: {paymentOptions.join(", ")}</div>
        </div>

        {/* 🪟 Netbanking Confirmation Modal */}
        {showNetModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md text-center">
              <h2 className="text-lg font-semibold mb-2">
                Confirm Netbanking Payment
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Please ensure your payment via {netbankingType.toUpperCase()} is
                complete. Once done, click below to confirm your order.
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

// ✅ Optional Utility Rows (unchanged)
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
