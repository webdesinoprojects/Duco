// src/auth/adminAuth.js
const KEY = "adminAuth";
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function setAdminLoggedIn(ttl = TTL_MS) {
  const exp = Date.now() + ttl;
  localStorage.setItem(KEY, JSON.stringify({ exp }));
  const delay = exp - Date.now();
  if (delay > 0) setTimeout(() => localStorage.removeItem(KEY), delay);
}

export function isAdminLoggedIn() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return false;
  try {
    const { exp } = JSON.parse(raw);
    if (!exp || Date.now() > exp) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem(KEY);
    return false;
  }
}

export function clearAdmin() {
  localStorage.removeItem(KEY);
}
