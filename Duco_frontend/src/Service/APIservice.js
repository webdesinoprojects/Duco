import axios from "axios";
import { API_BASE_URL } from "../config/api.js";

// ✅ FIX: ensure backend base URL is always absolute (fallback for dev)
const API_BASE =
  (API_BASE_URL && API_BASE_URL.startsWith("http")
    ? API_BASE_URL
    : import.meta.env.VITE_API_BASE_URL) + "/";

/* --------------------------- MONEY MANAGEMENT --------------------------- */
export const fetchAllPrices = async () => {
  const response = await axios.get(`${API_BASE}money/get_money`);
  return response.data;
};

export const createOrUpdatePrice = async (data) => {
  const response = await axios.post(
    `${API_BASE}money/create_location_price_increase`,
    data,
    { headers: { "Content-Type": "application/json" } }
  );
  return response.data;
};

// ✅ Added: Get price increase by location (used in Cart.jsx)
export const getUpdatePricesByLocation = async (location) => {
  try {
    console.log("🌍 Checking price for location:", location);
    const res = await axios.post(
      `${API_BASE}money/get_location_increase`,
      { location },
      { headers: { "Content-Type": "application/json" } }
    );
    
    // ✅ Return the response data (includes success flag)
    return res.data; // expected: { success, percentage, currency, ... }
  } catch (err) {
    console.error("❌ Error fetching location-based prices:", err.response?.data || err.message);
    
    // ✅ Return default pricing instead of null
    return {
      success: false,
      percentage: 0,
      currency: {
        country: 'INR',
        toconvert: 1
      },
      message: 'Location not found, using default pricing'
    };
  }
};

/* ------------------------------- DESIGNS ------------------------------- */
export const fetchPreviousDesigns = async (userId) => {
  try {
    const res = await fetch(`${API_BASE}api/designs/user/${userId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch designs", err);
    return [];
  }
};

export const fetchPreviousDesignswithpreoduts = async (userId, productId) => {
  try {
    const res = await fetch(
      `${API_BASE}api/designs/user/${userId}/${productId}`
    );
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch designs", err);
    return [];
  }
};

export const createDesign = async (payload) => {
  try {
    const res = await axios.post(`${API_BASE}api/designs`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (err) {
    console.error("Design creation failed:", err.response?.data || err.message);
    return null;
  }
};

/* --------------------------- CATEGORY / SUBCATEGORY --------------------------- */
export const getCategories = async () => {
  try {
    const res = await axios.get(`${API_BASE}category/getall`);
    return res.data.category || [];
  } catch (err) {
    console.warn("⚠️ Error fetching categories, using empty list:", err?.message || err);
    return [];
  }
};

export const getSubcategoriesByCategoryId = async (categoryId) => {
  try {
    const res = await axios.get(`${API_BASE}subcategory/subcat/${categoryId}`);
    return res.data.data || [];
  } catch (err) {
    console.warn("⚠️ Error fetching subcategories, using empty list:", err?.message || err);
    return [];
  }
};

/* ------------------------------- PRODUCTS ------------------------------- */
export const getproducts = async () => {
  try {
    const res = await axios.get(`${API_BASE}products/get/`);
    return res.data || [];
  } catch (err) {
    console.warn("⚠️ Error fetching products, using empty list:", err?.message || err);
    return [];
  }
};

export const getproductssingle = async (id) => {
  try {
    const res = await axios.get(`${API_BASE}products/get/${id}`);
    return res.data || [];
  } catch (err) {
    console.warn("⚠️ Error fetching single product:", err?.message || err);
    return null;
  }
};

export const getproductcategory = async (idsub) => {
  try {
    const res = await axios.get(`${API_BASE}products/getsub/${idsub}`);
    return res.data || [];
  } catch (err) {
    console.warn("⚠️ Error fetching products by subcategory, using empty list:", err?.message || err);
    return [];
  }
};

export const Updateproductcate = async (id, updates) => {
  try {
    const res = await axios.put(`${API_BASE}products/update/${id}`, updates);
    return res.data || [];
  } catch (err) {
    console.error("Error updating product:", err);
    return null;
  }
};

export const deleteProduct = async (productId) => {
  if (!productId) throw new Error("productId is required");
  try {
    const res = await axios.delete(`${API_BASE}products/deleted/${productId}`);
    return res.data;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to delete product";
    throw new Error(msg);
  }
};

/* ------------------------------- ORDERS ------------------------------- */
export const fetchOrdersByUser = async (userId) => {
  try {
    const res = await fetch(`${API_BASE}api/order/user/${userId}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch orders", err);
    return [];
  }
};

/**
 * ✅ Create a completed order — triggers backend order creation + Printrove sync
 */
export async function completeOrder(paymentId, paymentmode, orderData) {
  // ✅ Validate required fields - accept either address (legacy) or addresses (new format)
  if (!orderData || !orderData.items || !orderData.user || (!orderData.address && !orderData.addresses)) {
    console.error("❌ Invalid orderData payload:", {
      hasOrderData: !!orderData,
      hasItems: !!orderData?.items,
      hasUser: !!orderData?.user,
      hasAddress: !!orderData?.address,
      hasAddresses: !!orderData?.addresses,
    });
    throw new Error("Invalid orderData payload");
  }

  try {
    const res = await axios.post(
      `${API_BASE}api/completedorder`,
      { paymentId, paymentmode, orderData }, // Send order data
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("✅ Order created successfully:", res.data);
    return res.data; // { success, order }
  } catch (err) {
    console.error(
      "❌ Error creating order:",
      err.response?.data || err.message
    );
    throw err;
  }
}

/* ------------------------------- BANNERS ------------------------------- */
export async function createBanner(link, heroText, buttonText, buttonLink, type) {
  try {
    const { data } = await axios.post(`${API_BASE}api/banners`, { 
      link,
      heroText: heroText || "Color Of Summer Outfit",
      buttonText: buttonText || "Shop the Look →",
      buttonLink: buttonLink || "/women",
      type: type || 'hero'
    });
    return { success: true, data: data.banner, error: null };
  } catch (err) {
    const message =
      err.response?.data?.error || err.message || "Failed to create banner";
    return { success: false, data: null, error: message };
  }
}

export async function listBanners() {
  try {
    const { data } = await axios.get(`${API_BASE}api/banners`);
    return { success: true, data: data.banners, error: null };
  } catch (err) {
    const message =
      err.response?.data?.error || err.message || "Failed to fetch banners";
    return { success: false, data: null, error: message };
  }
}

export async function updateBanner(id, link, heroText, buttonText, buttonLink, type) {
  try {
    const { data } = await axios.put(`${API_BASE}api/banners/${id}`, { 
      link,
      heroText: heroText || "Color Of Summer Outfit",
      buttonText: buttonText || "Shop the Look →",
      buttonLink: buttonLink || "/women",
      type: type || 'hero'
    });
    return { success: true, data: data.banner, error: null };
  } catch (err) {
    const message =
      err.response?.data?.error || err.message || "Failed to update banner";
    return { success: false, data: null, error: message };
  }
}

export async function deleteBanner(id) {
  try {
    const { data } = await axios.delete(`${API_BASE}api/banners/${id}`);
    return { success: true, data: null, error: null };
  } catch (err) {
    const message =
      err.response?.data?.error || err.message || "Failed to delete banner";
    return { success: false, data: null, error: message };
  }
}

/* ------------------------------- ADMIN LOGIN ------------------------------- */
export async function adminLogin(userid, password) {
  const { data } = await axios.post(`${API_BASE}api/admin/check`, {
    userid,
    password,
  });
  return !!data?.ok;
}

/* ------------------------------- CHARGE PLAN ------------------------------- */
/**
 * Returns a charge plan used for printing & P&F + tax rate.
 * Shape (recommended):
 * {
 *   slabs: [
 *     { min: 1, max: 9,    printingPerSide: 69, pnfPerUnit: 0, pnfFlat: 25 },
 *     { min: 10, max: 49,  printingPerSide: 49, pnfPerUnit: 0, pnfFlat: 25 },
 *     { min: 50, max: 999999, printingPerSide: 39, pnfPerUnit: 0, pnfFlat: 25 }
 *   ],
 *   gstRate: 0.05
 * }
 */
export const getChargePlanRates = async (qty = 1) => {
  try {
    const res = await axios.post(`${API_BASE}api/chargeplan/rates`, {
      qty: qty
    }, {
      timeout: 8000,
    });
    const data = res?.data;

    // Cache successful plan for offline/fallback use
    try {
      localStorage.setItem("chargePlanRates", JSON.stringify(data));
    } catch {}

    return data;
  } catch (err) {
    console.warn(
      "getChargePlanRates(): API failed, using cached/default plan.",
      err?.response?.status,
      err?.message
    );

    // 1) Try cached plan from localStorage
    try {
      const cached = localStorage.getItem("chargePlanRates");
      if (cached) return JSON.parse(cached);
    } catch {}

    // 2) Final hardcoded fallback (EDIT values to match your business rules)
    return {
      slabs: [
        { min: 1, max: 9, printingPerSide: 69, pnfPerUnit: 0, pnfFlat: 25 },
        { min: 10, max: 49, printingPerSide: 49, pnfPerUnit: 0, pnfFlat: 25 },
        {
          min: 50,
          max: 999999,
          printingPerSide: 39,
          pnfPerUnit: 0,
          pnfFlat: 25,
        },
      ],
      gstRate: 0.05, // 5%
    };
  }
};

// Optional: manual cache helper (safe to import even if unused)
export const cacheChargePlanRates = (plan) => {
  try {
    localStorage.setItem("chargePlanRates", JSON.stringify(plan));
  } catch {}
};

/**
 * ✅ NEW: Get charge plan totals (P&F, Printing, GST) for a given quantity
 * Returns: { success: true, data: { qty, perUnit: {...}, totals: {...} } }
 */
export const getChargePlanTotals = async (qty = 1, subtotal = 0) => {
  try {
    const res = await axios.post(`${API_BASE}api/chargeplan/totals`, {
      qty,
      subtotal,
    }, {
      timeout: 8000,
    });
    const data = res?.data;

    // Cache successful plan for offline/fallback use
    try {
      localStorage.setItem("chargePlanTotals", JSON.stringify(data));
    } catch {}

    return data;
  } catch (err) {
    console.warn(
      "getChargePlanTotals(): API failed, using cached/default plan.",
      err?.response?.status,
      err?.message
    );

    // 1) Try cached plan from localStorage
    try {
      const cached = localStorage.getItem("chargePlanTotals");
      if (cached) return JSON.parse(cached);
    } catch {}

    // 2) Final hardcoded fallback with new format
    const packaging = qty <= 50 ? 12 : qty <= 200 ? 10 : 8;
    const printing = qty <= 50 ? 15 : qty <= 200 ? 12 : 10;
    const gstPercent = 5;
    
    const pfTotal = packaging * qty;
    const printTotal = printing * qty;
    const gstAmount = ((subtotal + pfTotal + printTotal) * gstPercent) / 100;
    
    return {
      success: true,
      data: {
        qty,
        perUnit: {
          pakageingandforwarding: packaging,
          printingcost: printing,
          gstPercent: gstPercent,
        },
        totals: {
          pakageingandforwarding: pfTotal,
          printingcost: printTotal,
          gstPercent,
          gstAmount,
          subtotal,
          grandTotal: subtotal + pfTotal + printTotal + gstAmount,
        },
      },
    };
  }
};

/* ------------------------------- BANK DETAILS ------------------------------- */
async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function getBankDetails(signal) {
  const res = await fetch(`${API_BASE}api/bankdetails`, { signal });
  return handle(res);
}

export async function getActiveBankDetails() {
  try {
    const res = await axios.get(`${API_BASE}api/bankdetails`);

    const list = Array.isArray(res?.data?.data)
      ? res.data.data
      : [];

    // ✅ FIX:
    // 1. Prefer explicitly active bank
    // 2. If none active AND only one record exists → use it
    const active =
      list.find((x) => x?.isactive === true) ||
      (list.length === 1 ? list[0] : null);

    return active;
  } catch (err) {
    console.error("❌ getActiveBankDetails failed:", err);
    return null;
  }
}

/* ------------------------------- INVOICE ------------------------------- */
export async function getInvoiceByOrder(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await axios.get(`${API_BASE}api/invoice/${orderId}`);
  return res.data; // { invoice, totals }
}

export async function getOrderById(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await axios.get(`${API_BASE}api/order/${orderId}`);
  return res.data;
}

export async function refetchTrackingId(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await axios.get(`${API_BASE}api/order/${orderId}/refetch-tracking`);
  return res.data;
}

export async function uploadInvoicePdf(orderId, pdfBlob) {
  if (!orderId) throw new Error("orderId is required");
  if (!pdfBlob) throw new Error("pdfBlob is required");
  const formData = new FormData();
  formData.append("file", pdfBlob, `invoice-${orderId}.pdf`);
  const res = await axios.post(`${API_BASE}api/invoice/upload/${orderId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/* ------------------------------- WALLET ------------------------------- */
export async function getWallet(userId) {
  if (!userId) throw new Error("Missing userId for getWallet");
  const url = `${API_BASE}api/wallet/${userId}`;
  const res = await axios.get(url);
  return res.data; // { _id, user, balance?, transactions: [...] }
}


/* ------------------------------- DESIGN UPLOAD FOR ORDERS ------------------------------- */
/**
 * Upload design preview images for an order
 * @param {string} orderId - The order ID
 * @param {object} designImages - Object with front, back, left, right preview images (base64 data URLs)
 * @returns {Promise} Response from backend
 */
export const uploadDesignImagesForOrder = async (orderId, designImages) => {
  try {
    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Only send if there are actual images
    if (!designImages || Object.keys(designImages).length === 0) {
      console.warn("⚠️ No design images to upload");
      return { success: false, message: "No design images provided" };
    }

    console.log("📤 Uploading design images for order:", orderId);

    const res = await axios.post(
      `${API_BASE}api/design/upload/${orderId}`,
      { designImages },
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Design images uploaded successfully:", res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Failed to upload design images:", err.response?.data || err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message,
      error: err.response?.data?.error || err.message
    };
  }
};

/* ------------------------------- CONTACT US ------------------------------- */
export async function sendContactMessage({ name, email, message }) {
  const url = `${API_BASE}api/contact`;
  const res = await axios.post(url, { name, email, message });
  return res.data;
}
