// Centralized API configuration
// Production URL: https://duco-67o5.onrender.com
const getApiBaseUrl = () => {
    // Always use production URL
    return import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
};

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
    environment: import.meta.env.MODE
});