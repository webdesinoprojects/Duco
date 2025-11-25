// utils/addressHelper.js

/**
 * Get billing address from order (supports both old and new format)
 */
function getBillingAddress(order) {
  // New format: addresses.billing
  if (order.addresses && order.addresses.billing) {
    return order.addresses.billing;
  }
  
  // Legacy format: single address field
  if (order.address) {
    return order.address;
  }
  
  return null;
}

/**
 * Get shipping address from order (supports both old and new format)
 */
function getShippingAddress(order) {
  // New format: addresses.shipping
  if (order.addresses && order.addresses.shipping) {
    return order.addresses.shipping;
  }
  
  // Legacy format: single address field (same as billing)
  if (order.address) {
    return order.address;
  }
  
  return null;
}

/**
 * Check if shipping address is same as billing
 */
function isSameAsBilling(order) {
  if (order.addresses && typeof order.addresses.sameAsBilling === 'boolean') {
    return order.addresses.sameAsBilling;
  }
  
  // Legacy: always true (single address)
  return true;
}

/**
 * Format address for display
 */
function formatAddress(address) {
  if (!address) return 'N/A';
  
  const parts = [
    address.houseNumber,
    address.street,
    address.landmark,
    address.city,
    `${address.state} - ${address.pincode}`,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Format address for invoice/label (multi-line)
 */
function formatAddressMultiline(address) {
  if (!address) return 'N/A';
  
  return [
    address.fullName,
    `${address.houseNumber}, ${address.street}`,
    address.landmark || '',
    `${address.city}, ${address.state} - ${address.pincode}`,
    address.country,
    `Phone: ${address.mobileNumber}`,
    address.email ? `Email: ${address.email}` : ''
  ].filter(Boolean).join('\n');
}

/**
 * Normalize order data to ensure addresses field exists
 */
function normalizeOrderAddresses(orderData) {
  // If new format already exists, return as is
  if (orderData.addresses) {
    return orderData;
  }
  
  // If old format exists, convert to new format
  if (orderData.address) {
    orderData.addresses = {
      billing: orderData.address,
      shipping: orderData.address,
      sameAsBilling: true
    };
  }
  
  return orderData;
}

/**
 * Get address for Printrove (always use shipping address)
 */
function getPrintroveAddress(order) {
  return getShippingAddress(order);
}

module.exports = {
  getBillingAddress,
  getShippingAddress,
  isSameAsBilling,
  formatAddress,
  formatAddressMultiline,
  normalizeOrderAddresses,
  getPrintroveAddress
};
