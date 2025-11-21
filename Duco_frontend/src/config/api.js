// Centralized API configuration
const getApiBaseUrl = () => {
    // Check if we're in development or production
    if (import.meta.env.DEV) {
        return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    }

    // In production, use environment variable or fallback to relative URL
    return import.meta.env.VITE_API_BASE_URL || window.location.origin;
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