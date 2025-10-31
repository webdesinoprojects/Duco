import React from "react";
import { usePriceContext } from "../ContextAPI/PriceContext";

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
  let displayPrice = Math.ceil(Number(price));
  
  // Skip conversion for cart items that are already converted (from TShirtDesigner)
  if (!skipConversion && toConvert && toConvert !== 1) {
    displayPrice = Math.ceil(displayPrice * toConvert);
  }

  console.log(`💱 PriceDisplay: ${price} → ${currencySymbol}${displayPrice} (currency: ${currency}, rate: ${toConvert}, skipConversion: ${skipConversion})`);

  return <p className={className}>{currencySymbol}{displayPrice}</p>;
};

export default PriceDisplay;
