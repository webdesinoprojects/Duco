// Frontend API service for order tracking
import { API_ENDPOINTS } from "../config/api.js";

const API_BASE = API_ENDPOINTS.API;

const jsonHeaders = { "Content-Type": "application/json" };

/** Robust response handler */
const handle = async (res) => {
  const text = await res.text();
  let data = null;
  try { 
    data = text ? JSON.parse(text) : null; 
  } catch { 
    data = text || null; 
  }
  
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

// Get comprehensive tracking information for an order
export const getOrderTracking = async (orderId) => {
  const response = await fetch(`${API_BASE}/tracking/${orderId}`, {
    method: "GET",
    headers: jsonHeaders
  });
  return handle(response);
};

// Sync order status with Printrove
export const syncOrderStatus = async (orderId) => {
  const response = await fetch(`${API_BASE}/tracking/${orderId}/sync`, {
    method: "POST",
    headers: jsonHeaders
  });
  return handle(response);
};

// Get Printrove order status directly
export const getPrintroveOrderStatus = async (printroveOrderId) => {
  const response = await fetch(`${API_BASE}/printrove/${printroveOrderId}`, {
    method: "GET",
    headers: jsonHeaders
  });
  return handle(response);
};

// Get user orders with tracking info
export const getUserOrdersWithTracking = async (userId) => {
  const response = await fetch(`${API_BASE}/user/${userId}/orders`, {
    method: "GET",
    headers: jsonHeaders
  });
  return handle(response);
};

// Admin: Bulk sync all order statuses
export const bulkSyncOrderStatuses = async () => {
  const response = await fetch(`${API_BASE}/admin/sync-all`, {
    method: "POST",
    headers: jsonHeaders
  });
  return handle(response);
};

// Admin: Update order status manually
export const updateOrderStatus = async (orderId, status, note = '') => {
  const response = await fetch(`${API_BASE}/admin/order/${orderId}/status`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ status, note })
  });
  return handle(response);
};