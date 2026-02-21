import React from "react";
import { usePriceContext } from "../ContextAPI/PriceContext";
import { formatPriceDisplay } from "../utils/currencyUtils";

const currencySymbols = {
  INR: "₹", // Indian Rupee
  USD: "$", // US Dollar
  AED: "د.إ", // UAE Dirham
  EUR: "€", // Euro
  GBP: "£", // British Pound
  AUD: "A$", // Australian Dollar
  CAD: "C$", // Canadian Dollar
  SGD: "S$", // Singapore Dollar
  NZD: "NZ$", // New Zealand Dollar
  CHF: "CHF", // Swiss Franc
  JPY: "¥", // Japanese Yen
  CNY: "¥", // Chinese Yuan
  HKD: "HK$", // Hong Kong Dollar
  MYR: "RM", // Malaysian Ringgit
  THB: "฿", // Thai Baht
  SAR: "﷼", // Saudi Riyal
  QAR: "ر.ق", // Qatari Riyal
  KWD: "KD", // Kuwaiti Dinar
  BHD: "BD", // Bahraini Dinar
  OMR: "﷼", // Omani Rial
  ZAR: "R", // South African Rand
  PKR: "₨", // Pakistani Rupee
  LKR: "Rs", // Sri Lankan Rupee
  BDT: "৳", // Bangladeshi Taka
  NPR: "रू", // Nepalese Rupee
  PHP: "₱", // Philippine Peso
  IDR: "Rp", // Indonesian Rupiah
  KRW: "₩", // South Korean Won
};

const PriceDisplay = ({ price, className, skipConversion = false }) => {
  const { currency, toConvert } = usePriceContext();
  
  // Get currency symbol
  const currencySymbol = currencySymbols[currency] || "₹";
  
  // Convert price to target currency only if not already converted
  let displayPrice = Number(price);
  
  // ✅ FIXED: If skipConversion is true, NEVER re-apply conversion
  // The caller is responsible for ensuring the price is already in the correct currency
  if (skipConversion) {
    // Price is already converted, just display it
    console.log(`💱 PriceDisplay (SKIP): ${price} → ${currencySymbol}${formatPriceDisplay(displayPrice, currency)}`);
  } else if (toConvert && toConvert !== 1 && toConvert > 0) {
    // Apply conversion
    displayPrice = displayPrice * toConvert;
    console.log(`💱 PriceDisplay (CONVERTED): ${price} × ${toConvert} = ${displayPrice} ${currencySymbol}`);
  } else {
    console.log(`💱 PriceDisplay: ${price} → ${currencySymbol}${formatPriceDisplay(displayPrice, currency)} (no conversion needed)`);
  }

  // ✅ Use formatPriceDisplay: INR = whole numbers, others = 2 decimals
  return <p className={className}>{currencySymbol}{formatPriceDisplay(displayPrice, currency)}</p>;
};

export default PriceDisplay;
