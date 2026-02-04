// 📁 src/Components/PaymentButton.jsx
import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LZString from "lz-string";
import { API_BASE_URL } from "../config/api.js";

const PaymentButton = ({ orderData }) => {
  const navigate = useNavigate();
  const API_BASE = `${API_BASE_URL}/`;

  // Load Razorpay SDK safely with data attributes
  const loadScript = (src) =>
    new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        console.log('✅ Razorpay SDK already loaded');
        resolve(true);
        return;
      }
      console.log('📥 Loading Razorpay SDK from:', src);
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        console.log('✅ Razorpay SDK loaded successfully');
        resolve(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load Razorpay SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    console.group('💳 PaymentButton: Starting payment process');
    console.log('📊 Order Data received:', {
      totalPay: orderData?.totalPay,
      isHalfPayment: orderData?.isHalfPayment,
      displayCurrency: orderData?.displayCurrency,
      hasOrderData: !!orderData
    });

    // ✅ Validate amount
    const paymentAmount = orderData?.totalPay;
    if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
      console.error('❌ Invalid payment amount:', paymentAmount);
      alert("Invalid payment amount. Please ensure your cart has items.");
      return;
    }

    // ✅ Razorpay INR minimum is ₹1 (1 paise minimum in the backend)
    // For safety, we recommend ₹10 minimum for real transactions
    if (paymentAmount < 1) {
      console.error('❌ Amount too small:', paymentAmount);
      alert("Payment amount is too small. Minimum is ₹1.");
      return;
    }

    const razorpayKey = "rzp_live_S3KJGyRC23sO17"; // ✅ LIVE KEY (matches backend)
    console.log('🔑 Using Razorpay Key:', razorpayKey.substring(0, 20) + '...');

    const sdkLoaded = await loadScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );

    if (!sdkLoaded || !window.Razorpay) {
      console.error('❌ Razorpay SDK failed to load');
      alert("Razorpay SDK failed to load");
      return;
    }

    // ✅ Disable Standard Checkout - force traditional Hosted Checkout
    if (window.Razorpay) {
      window.Razorpay.defaults = window.Razorpay.defaults || {};
      window.Razorpay.defaults.prefill = { contact: '', email: '' };
    }

    try {
      // 1️⃣ Payment amount
      // ✅ IMPORTANT: If isHalfPayment is true, orderData.totalPay is ALREADY the 50% amount
      // The frontend (PaymentPage) calculates halfPayAmountINR and passes it as totalPay
      // So we should use it directly, NOT divide by 2 again!
      let finalAmount = orderData.totalPay;
      
      // ✅ For 50% payments, ensure amount is properly rounded
      if (orderData.isHalfPayment) {
        finalAmount = Math.ceil(finalAmount);
        console.log('💰 50% Payment - Rounded amount:', {
          original: orderData.totalPay,
          rounded: finalAmount,
          difference: finalAmount - orderData.totalPay
        });
      }
      
      // ✅ Final validation: amount must be >= 1 paise minimum
      if (finalAmount < 1) {
        console.error('❌ Amount less than minimum (1 paise):', finalAmount);
        alert("Payment amount is less than minimum (₹0.01). Please ensure order has items.");
        return;
      }
      
      console.log('💰 Payment calculation:', {
        original: orderData.totalPay,
        isHalf: orderData.isHalfPayment,
        final: finalAmount,
        inPaise: Math.round(finalAmount * 100),
        isValid: finalAmount >= 1
      });

      // 2️⃣ Create order on backend
      const { data } = await axios.post(
        `${API_BASE}api/payment/create-order`,
        {
          amount: finalAmount,
          currency: "INR",
          half: orderData.isHalfPayment || false,
          displayCurrency: orderData?.displayCurrency,
          displayAmount: orderData?.totalPayDisplay,
          customerCountry: orderData?.address?.country,
          customerCity: orderData?.address?.city,
          customerState: orderData?.address?.state,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Backend response:', {
        orderId: data?.orderId,
        amount: data?.amount,
        currency: data?.paymentCurrency,
        responseType: typeof data
      });

      const { orderId, amount } = data;

      // 3️⃣ Validate order creation
      if (!orderId || amount === undefined || amount === null) {
        console.error('❌ Invalid backend response:', data);
        console.error('❌ Expected: orderId and amount (in paise)');
        alert("Failed to create payment order");
        return;
      }

      // ✅ Validate amount is a valid number and > 0
      const validAmount = Number(amount);
      if (isNaN(validAmount) || validAmount <= 0) {
        console.error('❌ Invalid amount from backend:', amount, 'Type:', typeof amount);
        alert("Invalid payment amount received from server");
        return;
      }

      console.log('✅ Order created:', {
        orderId,
        amount: validAmount,
        amountType: typeof validAmount,
        isValid: !isNaN(validAmount) && validAmount > 0
      });

      // 4️⃣ Razorpay checkout options
      const options = {
        key: razorpayKey,
        amount: validAmount, // ✅ Must be in paise (₹1 = 100 paise)
        currency: "INR",
        name: "Duco Art",
        description: "Order Payment",
        order_id: orderId,

        handler: async (response) => {
          console.group('✅ Payment successful');
          console.log('Payment response:', {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id
          });
          console.groupEnd();
          
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
              console.error('❌ Verification failed:', verify.data);
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
          } catch (err) {
            console.error('❌ Payment verification error:', err);
            alert("Payment verification error");
          }
        },

        prefill: {
          name: String(
            orderData?.user?.name ||
            orderData?.address?.fullName ||
            "Customer"
          ).trim().substring(0, 255),
          email: String(
            orderData?.user?.email ||
            orderData?.address?.email ||
            ""
          ).trim().toLowerCase(),
          contact: String(
            orderData?.user?.phone ||
            orderData?.address?.mobileNumber ||
            ""
          ).trim().replace(/\D/g, ''), // ✅ Remove non-digits
        },

        theme: { color: "#E5C870" },
      };

      console.log('🔧 Razorpay options:', {
        key: options.key.substring(0, 20) + '...',
        amount: options.amount,
        orderId: options.order_id,
        name: options.name,
        prefillName: options.prefill.name,
        prefillEmail: options.prefill.email,
        prefillPhone: options.prefill.contact
      });

      // ✅ Log the complete options for debugging
      console.log('📋 Complete Razorpay Options:', JSON.stringify(options, null, 2));

      let rzp;
      try {
        rzp = new window.Razorpay(options);
      } catch (err) {
        console.error('❌ Failed to initialize Razorpay:', {
          message: err.message,
          error: err
        });
        alert("Failed to initialize payment gateway: " + err.message);
        return;
      }
      
      rzp.on("payment.failed", (err) => {
        console.error('❌ Razorpay payment failed:', {
          errorCode: err.error?.code,
          errorDescription: err.error?.description,
          errorSource: err.error?.source,
          errorReason: err.error?.reason,
          fullError: err
        });
        alert(err.error?.description || "Payment failed");
      });

      // ✅ Handle other Razorpay events
      rzp.on("payment.success", (response) => {
        console.log('✅ Razorpay payment success event:', response);
      });

      // ✅ Add small delay to ensure order is created in Razorpay's system before opening
      setTimeout(() => {
        try {
          console.log('🚀 Opening Razorpay checkout with amount:', validAmount, 'paise');
          rzp.open();
        } catch (err) {
          console.error('❌ Failed to open Razorpay checkout:', {
            message: err.message,
            errorCode: err.code,
            error: err
          });
          alert("Failed to open payment checkout: " + err.message);
        }
      }, 300);
      
      console.groupEnd();
    } catch (err) {
      console.group('❌ PaymentButton Error');
      console.error('Full error:', err);
      console.error('Error message:', err.message);
      console.error('Response data:', err.response?.data);
      console.groupEnd();
      alert("Unable to start payment: " + (err.response?.data?.details || err.message || "Unknown error"));
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
