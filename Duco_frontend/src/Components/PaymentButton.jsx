// 📁 src/Components/PaymentButton.jsx
import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from "lz-string"; // ✅ added for compression

const PaymentButton = ({ orderData }) => {
  const navigate = useNavigate();
  const API_BASE = "https://duco-67o5.onrender.com/";

  // ✅ Load Razorpay SDK with better error handling
  const loadScript = (src) => {
    return new Promise((resolve) => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        console.log("📥 Razorpay SDK already loaded");
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        console.log("✅ Razorpay SDK loaded successfully");
        resolve(true);
      };
      script.onerror = (error) => {
        console.error("❌ Failed to load Razorpay SDK:", error);
        resolve(false);
      };
      
      // Add timeout
      setTimeout(() => {
        if (!script.onload) {
          console.error("⏰ Razorpay SDK loading timeout");
          resolve(false);
        }
      }, 10000); // 10 second timeout
      
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    // ✅ Debug: Check orderData structure
    console.group("💳 FRONTEND: Payment Button Debug");
    console.log("📦 OrderData received:", {
      totalPay: orderData.totalPay,
      totals: orderData.totals,
      hasItems: !!orderData.items,
      itemCount: orderData.items?.length || 0
    });

    // ✅ Debug: Check individual items and their prices
    console.log("🛍️ Individual items breakdown:");
    orderData.items?.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        name: item.products_name || item.name,
        price: item.price,
        quantity: item.quantity,
        total: typeof item.quantity === 'object' 
          ? Object.values(item.quantity).reduce((sum, qty) => sum + (qty * item.price), 0)
          : (item.quantity * item.price),
        id: item.id,
        createdAt: item.createdAt || 'Unknown'
      });
    });

    // ✅ Debug: Check if there are old items in localStorage
    const localStorageCart = JSON.parse(localStorage.getItem('cart') || '[]');
    console.log("💾 LocalStorage cart:", localStorageCart.length, "items");
    if (localStorageCart.length > 0) {
      console.log("💾 LocalStorage items:", localStorageCart.map(item => ({
        name: item.products_name || item.name,
        price: item.price,
        id: item.id,
        timestamp: item.timestamp || 'Unknown'
      })));
    }

    if (!orderData.totalPay || orderData.totalPay <= 0) {
      console.error("❌ Invalid totalPay:", orderData.totalPay);
      alert("Invalid payment amount. Please check your cart total.");
      console.groupEnd();
      return;
    }

    console.log("✅ Payment amount validated:", orderData.totalPay);
    console.log("🌐 API Base URL:", API_BASE);
    console.log("🔑 Environment variables check:", {
      razorpayKey: import.meta.env.VITE_RAZORPAY_KEY_ID ? 'Set' : 'Not set',
      nodeEnv: import.meta.env.NODE_ENV,
      mode: import.meta.env.MODE
    });
    console.groupEnd();

    console.log("📥 Loading Razorpay SDK...");
    const isScriptLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!isScriptLoaded) {
      console.error("❌ Failed to load Razorpay SDK");
      alert("Failed to load Razorpay SDK. Please check your internet connection and try again.");
      return;
    }

    console.log("✅ Razorpay SDK loaded successfully");

    // Check if Razorpay is available
    if (typeof window.Razorpay === 'undefined') {
      console.error("❌ Razorpay object not found after loading SDK");
      alert("Razorpay payment system is not available. Please try again.");
      return;
    }

    try {
      // ✅ 1. Create Razorpay Order from backend
      console.log("📤 Sending payment request with amount:", orderData.totalPay);
      console.log("🌐 Making request to:", `${API_BASE}api/payment/create-order`);
      
      const { data } = await axios.post(`${API_BASE}api/payment/create-order`, {
        amount: orderData.totalPay, // totalPay in INR (backend will convert to paise)
        half: false, // only full payment here
      });

      console.log("✅ Payment order created successfully:", data);

      const { orderId, amount } = data;

      // ✅ 2. Configure Razorpay options
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_RKkNoqkW7sQisX";
      console.log("🔑 Using Razorpay Key:", razorpayKey);
      
      const options = {
        key: razorpayKey, // 🔑 your Razorpay key from environment
        amount: amount, // in paise
        currency: "INR",
        name: "Your Brand Name",
        description: "T-shirt Order",
        order_id: orderId,
        handler: async function (response) {
          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
            response;

          try {
            // ✅ 3. Verify payment with backend
            const verifyRes = await axios.post(`${API_BASE}api/payment/verify`, {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
            });

            if (verifyRes.data.success) {
              // ✅ 4. Compress orderData before sending
              const compressedOrder = LZString.compressToBase64(
                JSON.stringify(orderData)
              );

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
              alert("Payment verification failed. Please try again.");
            }
          } catch (err) {
            console.error("Verification Error:", err);
            alert("Verification request failed.");
          }
        },
        // ✅ Prefill with fallback (address if user email/phone missing)
        prefill: {
          name:
            orderData?.user?.name ||
            orderData?.address?.fullName ||
            "Guest User",
          contact:
            orderData?.user?.phone ||
            orderData?.address?.mobileNumber ||
            "",
          email:
            orderData?.user?.email ||
            orderData?.address?.email ||
            "",
        },
        theme: {
          color: "#E5C870",
        },
      };

      // ✅ 6. Open Razorpay Checkout
      console.log("🚀 Opening Razorpay checkout with options:", {
        key: options.key,
        amount: options.amount,
        currency: options.currency,
        order_id: options.order_id
      });

      try {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          console.error("💳 Payment failed:", response.error);
          alert(`Payment failed: ${response.error.description}`);
        });
        rzp.open();
      } catch (razorpayError) {
        console.error("❌ Error opening Razorpay checkout:", razorpayError);
        alert("Failed to open payment gateway. Please try again.");
      }
    } catch (error) {
      console.error("Payment Error", error);
      alert("Something went wrong. Try again.");
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
