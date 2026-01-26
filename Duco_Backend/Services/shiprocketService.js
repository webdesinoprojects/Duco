const axios = require("axios");
const { getShiprocketToken } = require("../utils/shiprocket");

// Demo mode (unchanged)
const getMockShiprocketResponse = (order) => {
  const randomAwb = Math.random().toString(36).substring(2, 15).toUpperCase();
  const randomShipmentId = Math.floor(Math.random() * 1000000000);

  return {
    shipment_id: randomShipmentId,
    awb_code: `MOCK${randomAwb}${Math.floor(Math.random() * 10000)}`,
    courier_name: "MockCourier (Demo Mode)",
    status: "pending",
  };
};

const createShiprocketOrder = async (order) => {
  // DEMO MODE
  if (process.env.USE_MOCK_SHIPROCKET === "true") {
    console.log("🎭 DEMO MODE ENABLED");
    return {
      success: true,
      data: getMockShiprocketResponse(order)
    };
  }

  try {
    const token = await getShiprocketToken();

    const shippingAddress =
    order.addresses?.shipping ||
    order.address || {
      fullName: "Duco Customer",
      email: "support@ducoart.com",
      mobileNumber: "9039907559",
      houseNumber: "Avanti Vihar",
      street: "LIG 64",
      city: "Raipur",
      state: "Chhattisgarh",
      pincode: "492007",
      country: "India"
    };


    if (!shippingAddress) {
      return {
        success: false,
        error: "Shipping address missing in order"
      };
    }

    // ✅ CALCULATE subtotal properly
    const subTotal = order.products.reduce(
      (sum, p) => sum + (p.price || 0) * (p.qty || 1),
      0
    );

    const payload = {
      order_id: `${order.orderId}-${Date.now()}`,
      order_date: new Date(order.createdAt).toISOString().split("T")[0],
      channel_id: 5165297,
      pickup_location: "15540e81",

      order_type: "FORWARD",

      billing_customer_name: shippingAddress.fullName,
      billing_last_name: "",
      billing_address: `${shippingAddress.houseNumber} ${shippingAddress.street}`,
      billing_city: shippingAddress.city,
      billing_pincode: shippingAddress.pincode,
      billing_state: shippingAddress.state,
      billing_country: "India",
      billing_email: shippingAddress.email,
      billing_phone: String(shippingAddress.mobileNumber).slice(-10),

      shipping_is_billing: true,

      order_items: order.products.map((p, i) => ({
        name: p.name || `Item-${i + 1}`,
        sku: p.sku || `SKU-${i + 1}`,
        units: p.qty || 1,
        selling_price: Number(p.price),
      })),

      payment_method:
        order.paymentmode === "COD" ? "COD" : "Prepaid",

      sub_total: Number(order.price),

      shipping_charges: 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discount: 0,

      length: 10,
      breadth: 10,
      height: 5,
      weight: 0.5,
    };

    console.log("📦 Shiprocket Payload:", JSON.stringify(payload, null, 2));

    console.log("🔐 Token being used:", token?.substring(0, 20) + "...");
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Shiprocket Response:", response.data);
    return {
      success: true,
      data: response.data
    };

  } catch (err) {
    console.error("❌ Shiprocket failed:", err.response?.data || err.message);

    return {
      success: false,
      error:
        err.response?.data?.message ||
        "Shiprocket unavailable / inventory sync off"
    };
  }
};

module.exports = { createShiprocketOrder };
