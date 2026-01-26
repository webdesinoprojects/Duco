// 📁 src/Components/PaymentButton.jsx
import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from "lz-string";
import { API_BASE_URL } from "../config/api.js";

const PaymentButton = ({ orderData }) => {
  const navigate = useNavigate();
  const API_BASE = `${API_BASE_URL}/`;

  // Load Razorpay SDK safely
  const loadScript = (src) =>
    new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    if (!orderData?.totalPay || orderData.totalPay <= 0) {
      alert("Invalid payment amount");
      return;
    }

    const razorpayKey = "rzp_live_S3KJGyRC23sO17"; // ✅ LIVE KEY (matches backend)

    const sdkLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!sdkLoaded || !window.Razorpay) {
      alert("Razorpay SDK failed to load");
      return;
    }

    try {
      // 1️⃣ Create order on backend
      const { data } = await axios.post(
        `${API_BASE}api/payment/create-order`,
        {
          amount: orderData.isHalfPayment
            ? Math.ceil(orderData.totalPay / 2)
            : orderData.totalPay,
          currency: "INR",
          half: orderData.isHalfPayment || false,
        }
      );

      const { orderId, amount } = data;

      // 2️⃣ Razorpay checkout options
      const options = {
        key: razorpayKey,
        amount,
        currency: "INR",
        name: "Duco Art",
        description: "Order Payment",
        order_id: orderId,

        handler: async (response) => {
          try {
            const verify = await axios.post(
              `${API_BASE}api/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (!verify.data.success) {
              alert("Payment verification failed");
              return;
            }

            const compressedOrder = LZString.compressToBase64(
              JSON.stringify(orderData)
            );

            navigate("/order-processing", {
              state: {
                paymentId: response.razorpay_payment_id,
                orderData: compressedOrder,
                compressed: true,
                paymentmode: orderData.isHalfPayment ? "50%" : "online",
                isHalfPayment: orderData.isHalfPayment || false,
              },
            });
          } catch {
            alert("Payment verification error");
          }
        },

        prefill: {
          name:
            orderData?.user?.name ||
            orderData?.address?.fullName ||
            "Customer",
          email:
            orderData?.user?.email ||
            orderData?.address?.email ||
            "",
          contact:
            orderData?.user?.phone ||
            orderData?.address?.mobileNumber ||
            "",
        },

        theme: { color: "#E5C870" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (err) => {
        alert(err.error.description || "Payment failed");
      });

      rzp.open();
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Unable to start payment");
    }
  };

  return (
    <button
      onClick={handlePayment}
      className="bg-[#E5C870] text-black px-4 py-2 rounded font-semibold w-full"
    >
      Pay Now
    </button>
  );
};

export default PaymentButton;
