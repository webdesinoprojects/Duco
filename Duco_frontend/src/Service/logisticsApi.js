// src/api/logisticsApi.js
import { API_ENDPOINTS } from "../config/api.js";

const API_BASE = API_ENDPOINTS.API; 



const jsonHeaders = { "Content-Type": "application/json" };

/** Robust response handler (works with empty bodies too) */
const handle = async (res) => {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }
  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      res.statusText ||
      "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const getOrders = async () =>
  handle(await fetch(`${API_BASE}/order?lightweight=false`, { method: "GET" }));

export const createLogistic = async (payload) =>
  handle(await fetch(`${API_BASE}/logistic`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  }));

export const updateLogistic = async (id, payload) =>
  handle(await fetch(`${API_BASE}/logistic/${id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify(payload),
  }));

/** Add populate=true to view order (_id,status,total) from your controller */
export const getLogisticsByOrder = async (orderId, { populate = true } = {}) =>
  handle(await fetch(
    `${API_BASE}/logistic/order/${orderId}?populate=${populate ? "true" : "false"}`,
    { method: "GET" }
  ));

export const getLogisticById = async (id) =>
  handle(await fetch(`${API_BASE}/logisticid/${id}`, { method: "GET" }));
