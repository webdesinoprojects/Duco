// 📁 src/Pages/OrderProcessing.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import LZString from "lz-string"; // ✅ Added for decompression

const OrderProcessing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Safely extract data from location.state
  const paymentId = location.state?.paymentId || null;
  let orderData = location.state?.orderData || null; // ✅ changed to let for decompression
  let paymentmode = location.state?.paymentmode || "online";
  const compressed = location.state?.compressed || false; // ✅ added flag if sent

  // ✅ Decompress if needed
  if (compressed && typeof orderData === "string") {
    try {
      const jsonString = LZString.decompressFromBase64(orderData);
      orderData = JSON.parse(jsonString);
      console.log("✅ Order data decompressed successfully (frontend)");
    } catch (e) {
      console.error("❌ Decompression failed:", e);
      toast.error("Order data corrupted. Redirecting...");
      navigate("/payment", { replace: true });
    }
  }

  // ✅ Normalize paymentmode (backend expects lowercase)
  paymentmode = paymentmode.toLowerCase();

  const API_BASE = "https://duco-67o5.onrender.com/";

  useEffect(() => {
    if (!paymentId || !orderData) {
      toast.error("Missing payment details. Redirecting...");
      navigate("/payment", { replace: true });
      return;
    }

    // ✅ Ensure address has email (backend requires it)
    if (!orderData?.address?.email) {
      orderData.address = {
        ...orderData.address,
        email: orderData?.user?.email || "noemail@placeholder.com",
      };
    }

    const completeOrder = async () => {
      try {
        console.group("🧾 ORDER COMPLETION DEBUG");

        // 🔹 Step 1: Log what’s being sent
        console.log(
          "🔄 Sending to Backend URL:",
          `${API_BASE}api/completedorder`
        );
        console.log("📦 Full Payload:", {
          paymentId,
          paymentmode,
          orderData,
        });

        // 🔹 Step 2: Verify orderData essentials before sending
        if (!orderData?.items || !orderData?.address || !orderData?.user) {
          console.error("❌ Missing essential order data fields!");
          toast.error("Invalid order data. Redirecting...");
          navigate("/payment", { replace: true });
          return;
        }

        // 🔹 Step 3: Send request to backend
        const response = await axios.post(`${API_BASE}api/completedorder`, {
          paymentId,
          paymentmode,
          orderData,
        });

        // 🔹 Step 4: Log backend response
        console.log("✅ Backend Response:", response.data);

        const data = response?.data;
        if (data?.success) {
          console.log(
            "🎯 Backend confirmed success. Order details:",
            data.order
          );
          const orderId =
            data?.order?._id || data?.orderId || orderData?.id || "UNKNOWN";
          toast.success("✅ Order completed successfully!");
          navigate(`/order-success/${orderId}`, { replace: true });
        } else {
          console.warn("⚠️ Backend returned error:", data?.message);
          toast.error(data?.message || "❌ Order failed. Please try again.");
          navigate("/payment", { replace: true });
        }

        console.groupEnd();
      } catch (error) {
        console.groupEnd();
        console.error("❌ Order processing error:", error);
        const errMsg =
          error.response?.data?.message ||
          error.message ||
          "Something went wrong. Please try again.";
        toast.error(errMsg);
        navigate("/payment", { replace: true });
      }
    };

    completeOrder();
  }, [navigate, paymentId, orderData, paymentmode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white text-xl font-semibold">
      Processing your order, please wait...
    </div>
  );
};

export default OrderProcessing;
