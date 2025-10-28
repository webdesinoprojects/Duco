// 📁 src/Pages/OrderProcessing.jsx
import React, { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import LZString from "lz-string"; // ✅ for decompression

const OrderProcessing = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [search] = useSearchParams();

  // ✅ Extract core data
  const paymentId = location.state?.paymentId || null;
  let orderData = location.state?.orderData || null;
  let paymentmode = location.state?.paymentmode || "online";
  const compressed = location.state?.compressed || false;
  const inboundPaymentMeta = location.state?.paymentMeta || null;

  // ✅ Recovery helpers
  const orderIdFromQuery = search.get("orderId");
  const processedFlag = location.state?.processed === true;
  const lastOrderId = localStorage.getItem("lastOrderId");

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

  const API_BASE = "http://localhost:3000/";

  useEffect(() => {
    // 1️⃣ If order already processed → go directly to success screen
    if (processedFlag || orderIdFromQuery || lastOrderId) {
      const finalId = orderIdFromQuery || lastOrderId;
      if (finalId) {
        console.log("⚙️ Skipping reprocess, redirecting to success page...");
        navigate(`/order-success/${finalId}`, {
          replace: true,
          state: {
            paymentMeta: inboundPaymentMeta || JSON.parse(localStorage.getItem("lastOrderMeta") || "{}"),
          },
        });
      }
      return;
    }

    // 2️⃣ If missing essentials → bail
    if (!paymentId || !orderData) {
      toast.error("Missing payment details. Redirecting...");
      navigate("/payment", { replace: true });
      return;
    }

    // 3️⃣ Ensure email
    if (!orderData?.address?.email) {
      orderData.address = {
        ...orderData.address,
        email: orderData?.user?.email || "noemail@placeholder.com",
      };
    }

    // 4️⃣ Complete order
    const complete = async () => {
      try {
        console.group("🧾 ORDER COMPLETION DEBUG");
        console.log("🔄 Backend URL:", `${API_BASE}api/completedorder`);
        console.log("📦 Sending payload:", { paymentId, paymentmode, orderData });

        // sanity check
        if (!orderData?.items || !orderData?.address || !orderData?.user) {
          console.error("❌ Missing essential order data fields!");
          toast.error("Invalid order data. Redirecting...");
          navigate("/payment", { replace: true });
          return;
        }
        // 🔹 Step 3: Send request to backend (with full charge data)
try {
  // ✅ Inject printing + P&F charges before sending to backend
  const storedCharges = JSON.parse(localStorage.getItem("lastCartCharges") || "{}");

  // fallback defaults if not available
  const pfCharge = Number(storedCharges.pf) || 30;
  const printingCharge = Number(storedCharges.printing) || 50;

  // ensure orderData.charges exists
  if (!orderData.charges || typeof orderData.charges !== "object") {
    orderData.charges = {};
  }

  orderData.charges.pf = pfCharge;
  orderData.charges.printing = printingCharge;

  console.log("🧾 Injected Charges into orderData before sending:", orderData.charges);

  // ✅ Send enriched payload to backend
  const response = await axios.post(`${API_BASE}api/completedorder`, {
    paymentId,
    paymentmode,
    orderData,
  });

  console.log("✅ Backend Response:", response.data);

  const data = response?.data;
  if (data?.success) {
    console.log("🎯 Backend confirmed success:", data.order);
    const orderId =
      data?.order?._id || data?.orderId || orderData?.id || "UNKNOWN";

    // store for refresh/deeplink
    if (orderId && orderId !== "UNKNOWN") {
      localStorage.setItem("lastOrderId", String(orderId));
    }

    // optional: keep any meta info
    if (inboundPaymentMeta) {
      localStorage.setItem(
        "lastOrderMeta",
        JSON.stringify(inboundPaymentMeta)
      );
    }

    toast.success("✅ Order completed successfully!");
    navigate(`/order-processing?orderId=${orderId}`, {
      replace: true,
      state: {
        processed: true,
        order: data.order,
        paymentMeta: inboundPaymentMeta || null,
      },
    });
  } else {
    console.warn("⚠️ Backend returned error:", data?.message);
    toast.error(data?.message || "❌ Order failed. Please try again.");
    navigate("/payment", { replace: true });
  }
} catch (error) {
  console.error("❌ Order processing error:", error);
  const errMsg =
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again.";
  toast.error(errMsg);
  navigate("/payment", { replace: true });
}
console.log("📤 FINAL PAYLOAD SENT TO BACKEND:", JSON.stringify(orderData, null, 2));

        // post to backend
        const response = await axios.post(`${API_BASE}api/completedorder`, {
          paymentId,
          paymentmode,
          orderData,
        });

        console.log("✅ Backend Response:", response.data);
        const data = response?.data;

        if (data?.success) {
          const orderId =
            data?.order?._id || data?.orderId || orderData?.id || "UNKNOWN";

          // save for refresh
          if (orderId && orderId !== "UNKNOWN") {
            localStorage.setItem("lastOrderId", String(orderId));
          }
          if (inboundPaymentMeta) {
            localStorage.setItem(
              "lastOrderMeta",
              JSON.stringify(inboundPaymentMeta)
            );
          }

          toast.success("✅ Order completed successfully!");

          // ✅ redirect to order-success/:orderId (not /order-processing)
          navigate(`/order-success/${orderId}`, {
            replace: true,
            state: {
              order: data.order,
              paymentMeta: inboundPaymentMeta || null,
            },
          });
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

    complete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    navigate,
    API_BASE,
    paymentId,
    orderData,
    paymentmode,
    processedFlag,
    orderIdFromQuery,
    lastOrderId,
  ]);

  /* --------------------------- UI feedback zone --------------------------- */
  const inSuccessView = processedFlag || orderIdFromQuery || lastOrderId;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white text-xl font-semibold text-center px-4">
      {inSuccessView ? (
        <div>
          <p>✅ Order placed successfully!</p>
          <p className="text-gray-300 text-sm mt-2">
            Redirecting you to your invoice...
          </p>
        </div>
      ) : (
        <div>
          <p>Processing your order...</p>
          <p className="text-gray-300 text-sm mt-2">
            Please do not refresh or close this page.
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderProcessing;
