// 📁 src/Components/PaymentButton.jsx
import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from "lz-string"; // ✅ added for compression

const PaymentButton = ({ orderData }) => {
  const navigate = useNavigate();
  const API_BASE = "http://localhost:3000/";

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
    const isScriptLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!isScriptLoaded) {
      alert("Failed to load Razorpay SDK. Check your connection.");
      return;
    }

    try {
      // ✅ 1. Create Razorpay Order from backend
      const { data } = await axios.post(`${API_BASE}api/payment/create-order`, {
        amount: orderData.totalPay, // totalPay in INR (backend will convert to paise)
        half: false, // only full payment here
      });

      const { orderId, amount } = data;

      // ✅ 2. Configure Razorpay options
      const options = {
        key: "rzp_live_RIY5FnqUMjz8c1", // 🔑 your Razorpay LIVE key
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
      const rzp = new window.Razorpay(options);
      rzp.open();
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
