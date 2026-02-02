// Centralized API configuration
// Production backend: https://duco-67o5.onrender.com

const DEFAULT_API_BASE_URL = 'https://duco-67o5.onrender.com';

const normalizeApiBaseUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return DEFAULT_API_BASE_URL;

    // Guard against accidentally deploying with an old backend domain.
    if (raw.includes('ducobackend.onrender.com')) return DEFAULT_API_BASE_URL;

    // Basic validity check; Vite injects this at build-time.
    if (!/^https?:\/\//i.test(raw)) return DEFAULT_API_BASE_URL;

    return raw.replace(/\/+$/, '');
};

const getApiBaseUrl = () => normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export const API_BASE_URL = getApiBaseUrl();
export const API_ENDPOINTS = {
    // User endpoints
    USER: `${API_BASE_URL}/user`,

    // Main API endpoints
    API: `${API_BASE_URL}/api`,

    // Specific service endpoints
    MONEY: `${API_BASE_URL}/money`,
    PRODUCTS: `${API_BASE_URL}/products`,
    CATEGORY: `${API_BASE_URL}/category`,
    SUBCATEGORY: `${API_BASE_URL}/subcategory`,
};

console.log('🔗 API Configuration:', {
    baseUrl: API_BASE_URL,
    environment: import.meta.env.MODE,
    envBaseUrl: import.meta.env.VITE_API_BASE_URL
});