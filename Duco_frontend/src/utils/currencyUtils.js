/**
 * Currency utility functions for handling international pricing
 */

/**
 * Formats price based on currency code
 * INR gets rounded to whole numbers (traditional Indian rupee display)
 * All other currencies get 2 decimal places (international standard)
 * 
 * @param {number|string} price - The price to format
 * @param {string} currencyCode - The currency code (e.g., 'INR', 'USD', 'SGD')
 * @returns {number} - Rounded number for INR, 2 decimal number for others
 */
export const formatPrice = (price, currencyCode) => {
  const numPrice = Number(price);
  
  // Handle NaN or invalid numbers
  if (isNaN(numPrice)) {
    return 0;
  }
  
  // For INR or null/undefined currency, return rounded integer (traditional rupee display)
  if (!currencyCode || currencyCode === 'INR') {
    return Math.round(numPrice);
  }
  
  // For all other currencies, return 2 decimal places (international standard)
  // ✅ CRITICAL FIX: Use Math.round to avoid floating point precision errors
  // Instead of: Number(numPrice.toFixed(2)) which can give 1.2099999999
  // Use: Math.round(numPrice * 100) / 100 which gives clean 1.21
  return Math.round(numPrice * 100) / 100;
};

/**
 * Formats price for display as a string with proper decimal formatting
 * 
 * @param {number|string} price - The price to format
 * @param {string} currencyCode - The currency code
 * @returns {string} - Formatted price string
 */
export const formatPriceDisplay = (price, currencyCode) => {
  const formatted = formatPrice(price, currencyCode);
  
  // For INR, show without decimals
  if (!currencyCode || currencyCode === 'INR') {
    return formatted.toString();
  }
  
  // For other currencies, ensure 2 decimal places in display
  return formatted.toFixed(2);
};
