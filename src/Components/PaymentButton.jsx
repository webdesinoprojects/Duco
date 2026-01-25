// 📁 src/Components/PaymentButton.jsx
import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from "lz-string"; // ✅ added for compression

const PaymentButton = ({ orderData }) => {
  const navigate = useNavigate();
  const API_BASE = "http://localhost:3002/";

  // ✅ Load Razorpay SDK
  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    console.group("🚀 PAYMENT FLOW STARTED");
    console.log("⏰ Payment initiated at:", new Date().toISOString());

    // ✅ 1. Validate orderData
    console.log("🔍 STEP 1: Validating orderData...");
    if (!orderData) {
      console.error("❌ CRITICAL: orderData is null/undefined");
      alert("Order data is missing. Please refresh and try again.");
      console.groupEnd();
      return;
    }

    if (!orderData.totalPay || orderData.totalPay <= 0) {
      console.error(
        "❌ CRITICAL: Invalid totalPay amount:",
        orderData.totalPay
      );
      alert("Invalid order amount. Please refresh and try again.");
      console.groupEnd();
      return;
    }

    if (!orderData.items || orderData.items.length === 0) {
      console.error("❌ CRITICAL: No items in order");
      alert("No items in cart. Please add items before payment.");
      console.groupEnd();
      return;
    }

    console.log("✅ Order data validation passed");

    // ✅ 2. Log detailed order data
    console.log("🔍 STEP 2: Order data details:", {
      hasOrderData: !!orderData,
      totalPay: orderData.totalPay,
      itemsCount: orderData.items?.length || 0,
      hasAddress: !!orderData.address,
      hasUser: !!orderData.user,
      addressDetails: orderData.address
        ? {
            fullName: orderData.address.fullName,
            email: orderData.address.email,
            mobileNumber: orderData.address.mobileNumber,
          }
        : null,
      userDetails: orderData.user
        ? {
            name: orderData.user.name,
            email: orderData.user.email,
            _id: orderData.user._id,
          }
        : null,
    });

    // ✅ 3. Load Razorpay SDK with detailed logging
    console.log("🔍 STEP 3: Loading Razorpay SDK...");
    console.log(
      "📦 Checking if Razorpay is already loaded:",
      !!window.Razorpay
    );

    const isScriptLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!isScriptLoaded) {
      console.error("❌ CRITICAL: Failed to load Razorpay SDK");
      console.error("🔍 Debug info:", {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        protocol: window.location.protocol,
        host: window.location.host,
      });
      alert(
        "Failed to load Razorpay SDK. Check your internet connection and try again."
      );
      console.groupEnd();
      return;
    }

    console.log("✅ Razorpay SDK loaded successfully");
    console.log("🔍 Razorpay object available:", !!window.Razorpay);
    console.groupEnd();

    try {
      console.group("💳 CREATING RAZORPAY ORDER");

      // ✅ 1. Create Razorpay Order from backend
      console.log("📤 Sending request to backend:", {
        url: `${API_BASE}api/payment/create-order`,
        amount: orderData.totalPay,
        half: false,
      });

      const { data } = await axios.post(`${API_BASE}api/payment/create-order`, {
        amount: orderData.totalPay, // totalPay in INR (backend will convert to paise)
        half: false, // only full payment here
      });

      console.log("📥 Backend response:", data);

      if (!data || !data.orderId) {
        console.error("❌ CRITICAL: Invalid response from backend:", data);
        alert("Failed to create payment order. Please try again.");
        return;
      }

      const { orderId, amount } = data;
      console.log("✅ Razorpay order created:", { orderId, amount });
      console.groupEnd();

      // ✅ 2. Configure Razorpay options
      console.group("🔍 STEP 4: CONFIGURING RAZORPAY OPTIONS");

      const razorpayKey = "rzp_test_RKkNoqkW7sQisX";
      console.log("🔑 Using Razorpay key:", razorpayKey);
      console.log("💰 Amount (paise):", amount);
      console.log("📦 Order ID:", orderId);

      const options = {
        key: razorpayKey, // 🔑 Fixed: Using TEST key (matches backend)
        amount: amount, // in paise
        currency: "INR",
        name: "Duco Art",
        description: `T-shirt Order - ${orderData.items.length} item(s)`,
        order_id: orderId,
        handler: async function (response) {
          console.group("💳 PAYMENT HANDLER TRIGGERED");
          console.log("📥 Razorpay response:", response);

          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
            response;

          try {
            console.log("🔐 Verifying payment with backend...");

            // ✅ 3. Verify payment with backend
            const verifyRes = await axios.post(
              `${API_BASE}api/payment/verify`,
              {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
              }
            );

            console.log("📥 Verification response:", verifyRes.data);

            if (verifyRes.data.success) {
              console.log("✅ Payment verification successful");

              // ✅ 4. Compress orderData before sending
              console.log("🗜️ Compressing order data...");
              const compressedOrder = LZString.compressToBase64(
                JSON.stringify(orderData)
              );

              console.log("🚀 Redirecting to order processing...");
              // ✅ 5. Redirect to order-processing with compressed data
              navigate("/order-processing", {
                state: {
                  paymentId: razorpay_payment_id,
                  orderData: compressedOrder, // compressed payload
                  compressed: true, // flag for backend
                  paymentmode: "online", // ✅ lowercase for backend
                },
              });
            } else {
              console.error("❌ Payment verification failed:", verifyRes.data);
              alert("Payment verification failed. Please try again.");
            }
          } catch (err) {
            console.error("❌ Verification Error:", err);
            console.error("❌ Error details:", {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status,
            });
            alert("Verification request failed. Please contact support.");
          }

          console.groupEnd();
        },
        // ✅ Prefill with fallback (address if user email/phone missing)
        prefill: {
          name:
            orderData?.user?.name ||
            orderData?.address?.fullName ||
            "Guest User",
          contact:
            orderData?.user?.phone || orderData?.address?.mobileNumber || "",
          email: orderData?.user?.email || orderData?.address?.email || "",
        },
        theme: {
          color: "#E5C870",
        },
      };

      console.log("⚙️ Razorpay options configured:", {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        order_id: options.order_id,
        prefill: options.prefill,
      });
      console.groupEnd();

      // ✅ 6. Open Razorpay Checkout
      console.group("🚀 OPENING RAZORPAY CHECKOUT");
      console.log(
        "🔍 Checking if Razorpay is available:",
        typeof window.Razorpay
      );

      if (typeof window.Razorpay === "undefined") {
        console.error(
          "❌ CRITICAL: Razorpay is not available on window object"
        );
        alert(
          "Razorpay SDK not loaded properly. Please refresh and try again."
        );
        return;
      }

      try {
        const rzp = new window.Razorpay(options);
        console.log("✅ Razorpay instance created successfully");
        console.log("🚀 Opening Razorpay checkout...");
        rzp.open();
        console.log("✅ Razorpay checkout opened");
      } catch (rzpError) {
        console.error(
          "❌ CRITICAL: Failed to create Razorpay instance:",
          rzpError
        );
        alert("Failed to initialize payment gateway. Please try again.");
      }

      console.groupEnd();
    } catch (error) {
      console.group("❌ PAYMENT ERROR");
      console.error("❌ Payment Error:", error);
      console.error("❌ Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      console.groupEnd();
      alert(
        "Something went wrong. Please check console for details and try again."
      );
    }
  };

  return (
    <button
      className="bg-[#E5C870] text-black px-4 py-2 rounded font-semibold w-full"
      onClick={handlePayment}
    >
      Pay Now
    </button>
  );
};

export default PaymentButton;
