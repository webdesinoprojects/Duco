/**
 * Tax Calculation Service
 * Handles GST/IGST/CGST/SGST calculations based on location
 */

// Company state (Chhattisgarh)
const COMPANY_STATE = 'chhattisgarh';
const COMPANY_STATE_CODE = '22';

/**
 * Normalize state name for comparison
 */
function normalizeState(state) {
  if (!state) return '';
  return state.toLowerCase().trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Extract state from address or place of supply
 */
function extractState(location) {
  if (!location) return '';
  
  const normalized = location.toLowerCase();
  
  // Check for Chhattisgarh variations
  if (normalized.includes('chhattisgarh') || 
      normalized.includes('chattisgarh') ||
      normalized.includes('c.g') ||
      normalized.includes('cg') ||
      normalized.includes('(22)')) {
    return 'chhattisgarh';
  }
  
  // List of Indian states
  const indianStates = [
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'puducherry', 'jammu and kashmir', 'ladakh'
  ];
  
  for (const state of indianStates) {
    if (normalized.includes(state)) {
      return normalizeState(state);
    }
  }
  
  return '';
}

/**
 * Check if location is in India
 */
function isInIndia(location) {
  if (!location) return false;
  
  const normalized = location.toLowerCase();
  
  // Check for India keywords
  if (normalized.includes('india') || 
      normalized.includes('bharat') ||
      extractState(location)) {
    return true;
  }
  
  return false;
}

/**
 * Calculate tax based on location
 * 
 * Rules (Updated for B2B and B2C):
 * 1. Same state (Chhattisgarh): CGST 2.5% + SGST 2.5% + IGST 0% = 5% total
 * 2. Different state in India: CGST 0% + SGST 0% + IGST 5% = 5% total
 * 3. Outside India: TAX 1% (no GST)
 * 
 * @param {number} amount - Taxable amount
 * @param {string} customerState - Customer's state
 * @param {string} customerCountry - Customer's country
 * @param {boolean} isB2B - Whether this is a B2B order (optional)
 * @returns {object} Tax breakdown
 */
function calculateTax(amount, customerState = '', customerCountry = '', isB2B = false) {
  const taxableAmount = Number(amount) || 0;
  
  // Check if customer is in India
  const inIndia = isInIndia(customerCountry) || isInIndia(customerState);
  
  if (!inIndia) {
    // Outside India: 1% TAX (no GST)
    const taxAmount = (taxableAmount * 1) / 100;
    return {
      type: 'INTERNATIONAL',
      taxRate: 1,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      taxAmount: taxAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: taxAmount,
      label: 'TAX (1%)',
      isSameState: false,
      isIndia: false,
      isB2B: isB2B
    };
  }
  
  // Extract customer state
  const custState = extractState(customerState);
  const isSameState = custState === COMPANY_STATE;
  
  if (isSameState) {
    // Same state (Chhattisgarh): CGST 2.5% + SGST 2.5% + IGST 0% = 5%
    const cgstAmount = (taxableAmount * 2.5) / 100;
    const sgstAmount = (taxableAmount * 2.5) / 100;
    const igstAmount = 0;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    
    return {
      type: 'INTRASTATE',
      taxRate: 5,
      cgstRate: 2.5,
      sgstRate: 2.5,
      igstRate: 0,
      taxAmount: 0,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      igstAmount: igstAmount,
      totalTax: totalTax,
      label: 'GST (5%)',
      isSameState: true,
      isIndia: true,
      isB2B: isB2B
    };
  } else {
    // Different state in India: CGST 0% + SGST 0% + IGST 5% = 5%
    const cgstAmount = 0;
    const sgstAmount = 0;
    const igstAmount = (taxableAmount * 5) / 100;
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    
    return {
      type: 'INTERSTATE',
      taxRate: 5,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 5,
      taxAmount: 0,
      cgstAmount: cgstAmount,
      sgstAmount: sgstAmount,
      igstAmount: igstAmount,
      totalTax: totalTax,
      label: 'GST (5%)',
      isSameState: false,
      isIndia: true,
      isB2B: isB2B
    };
  }
}

/**
 * Calculate order total with tax
 * Round off is always added (positive) to reach the next whole number
 * 
 * @param {number} subtotal - Items subtotal
 * @param {object} charges - P&F and printing charges
 * @param {string} customerState - Customer's state
 * @param {string} customerCountry - Customer's country
 * @param {boolean} isB2B - Whether this is a B2B order
 * @returns {object} Complete order breakdown with taxes
 */
function calculateOrderTotal(subtotal, charges = {}, customerState = '', customerCountry = '', isB2B = false) {
  const sub = Number(subtotal) || 0;
  const pf = Number(charges.pf || charges.pfCharges || 0);
  const printing = Number(charges.printing || charges.printingCharges || 0);
  
  const taxableAmount = sub + pf + printing;
  const taxInfo = calculateTax(taxableAmount, customerState, customerCountry, isB2B);
  
  const grandTotal = taxableAmount + taxInfo.totalTax;
  const roundedTotal = Math.ceil(grandTotal); // Always round up
  const roundOff = roundedTotal - grandTotal; // Always positive
  
  return {
    subtotal: sub,
    pfCharges: pf,
    printingCharges: printing,
    taxableAmount: taxableAmount,
    ...taxInfo,
    grandTotal: grandTotal,
    roundOff: roundOff,
    finalTotal: roundedTotal,
    isB2B: isB2B
  };
}

module.exports = {
  calculateTax,
  calculateOrderTotal,
  extractState,
  isInIndia,
  COMPANY_STATE,
  COMPANY_STATE_CODE
};
