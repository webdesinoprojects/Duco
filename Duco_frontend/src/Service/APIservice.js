import axios from "axios";

const API_BASE = "https://duco-67o5.onrender.com/"; // Backend Base URL

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
    return res.data; // expected: { success, percentage, currency, ... }
  } catch (err) {
    console.error("Error fetching location-based prices:", err);
    return null;
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
    console.error("Error fetching categories:", err);
    return null;
  }
};

export const getSubcategoriesByCategoryId = async (categoryId) => {
  try {
    const res = await axios.get(`${API_BASE}subcategory/subcat/${categoryId}`);
    return res.data.data || [];
  } catch (err) {
    console.error("Error fetching subcategories:", err);
    return null;
  }
};

/* ------------------------------- PRODUCTS ------------------------------- */
export const getproducts = async () => {
  try {
    const res = await axios.get(`${API_BASE}products/get/`);
    return res.data || [];
  } catch (err) {
    console.error("Error fetching products:", err);
    return null;
  }
};

export const getproductssingle = async (id) => {
  try {
    const res = await axios.get(`${API_BASE}products/get/${id}`);
    return res.data || [];
  } catch (err) {
    console.error("Error fetching single product:", err);
    return null;
  }
};

export const getproductcategory = async (idsub) => {
  try {
    const res = await axios.get(`${API_BASE}products/getsub/${idsub}`);
    return res.data || [];
  } catch (err) {
    console.error("Error fetching products by subcategory:", err);
    return null;
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
  if (!orderData || !orderData.items || !orderData.user || !orderData.address) {
    throw new Error("Invalid orderData payload");
  }

  try {
    const res = await axios.post(
      `${API_BASE}api/completedorder`,
      { paymentId, paymentmode, orderData },
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
export async function createBanner(link) {
  try {
    const { data } = await axios.post(`${API_BASE}api/banners`, { link });
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

export async function updateBanner(id, link) {
  try {
    const { data } = await axios.put(`${API_BASE}api/banners/${id}`, { link });
    return { success: true, data: data.banner, error: null };
  } catch (err) {
    const message =
      err.response?.data?.error || err.message || "Failed to update banner";
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
 * ✅ Fetch tiered pricing for Printing, P&F, and GST dynamically
 * Uses backend `/api/chargeplan/getTotalsForQty`
 */
export const getChargePlanRates = async (qty = 1, subtotal = 0) => {
  try {
    const res = await axios.get(`${API_BASE}api/chargeplan/getTotalsForQty`, {
      params: { qty, subtotal },
    });

    if (!res?.data?.success) {
      console.warn("⚠️ getChargePlanRates: No success field found.", res.data);
      return null;
    }

    const data = res.data.data || {};
    const perUnit = data.perUnit || {};
    const totals = data.totals || {};

    console.log("📦 Charge Plan Rates Fetched:", {
      qty: data.qty,
      perUnit,
      totals,
    });

    return {
      success: true,
      data: {
        qty: data.qty,
        perUnit, // { pakageingandforwarding, printingcost }
        totals, // { pakageingandforwarding, printingcost, gstPercent, gstAmount, grandTotal, subtotal }
        gstPercent: totals.gstPercent ?? 5,
      },
    };
  } catch (err) {
    console.error("❌ getChargePlanRates() failed:", err.message);

    // fallback to cached version
    try {
      const cached = localStorage.getItem("chargePlanRates");
      if (cached) return JSON.parse(cached);
    } catch {}

    // fallback hardcoded safe default
    return {
      success: true,
      data: {
        qty: 1,
        perUnit: { pakageingandforwarding: 10, printingcost: 15 },
        totals: { gstPercent: 5 },
      },
    };
  }
};

// Optional: manual cache helper
export const cacheChargePlanRates = (plan) => {
  try {
    localStorage.setItem("chargePlanRates", JSON.stringify(plan));
  } catch {}
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

export async function getActiveBankDetails(signal) {
  const data = await getBankDetails(signal);
  const list = Array.isArray(data) ? data : data?.items || data?.data || [];
  return list.find((x) => x?.isactive === true) || null;
}

/* ------------------------------- INVOICE ------------------------------- */
export async function getInvoiceByOrder(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await axios.get(`${API_BASE}api/invoice/${orderId}`);
  return res.data; // { invoice, totals }
}

/* ------------------------------- WALLET ------------------------------- */
export async function getWallet(userId) {
  if (!userId) throw new Error("Missing userId for getWallet");
  const url = `${API_BASE}api/wallet/${userId}`;
  const res = await axios.get(url);
  return res.data; // { _id, user, balance?, transactions: [...] }
}
