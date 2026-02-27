// src/ContextAPI/PriceContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { getUpdatePricesByLocation } from "../Service/APIservice";

const LOCATION_FALLBACK_DEFAULT = "India";
const locationToCountryCodeMap = {
  India: "IN",
  "United States": "US",
  Canada: "CA",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Spain: "ES",
  Italy: "IT",
  Australia: "AU",
  "New Zealand": "NZ",
  China: "CN",
  Japan: "JP",
  "South Korea": "KR",
  Singapore: "SG",
  UAE: "AE",
  "Saudi Arabia": "SA",
};

// ✅ Helper to get cached location as fallback (only used when API fails)
const getFallbackLocation = () => {
  let location = LOCATION_FALLBACK_DEFAULT;
  try {
    const cached = JSON.parse(localStorage.getItem("locationPricing"));
    if (cached && cached.location) {
      location = cached.location;
    }
  } catch (e) {
    console.warn("⚠️ Could not read cached location:", e);
  }
  return location;
};

// ❌ REMOVED: Axios interceptor that was preventing real-time location detection
// The interceptor was returning cached data for ALL ipapi.co calls, 
// which prevented VPN-based location changes from working.

const PriceContext = createContext();

export const PriceProvider = ({ children }) => {
  // ✅ Initialize with null - will be set after geolocation detection
  const [toConvert, setToConvert] = useState(null);
  const [priceIncrease, setPriceIncrease] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [resolvedLocation, setResolvedLocation] = useState(null);
  const [location, setLocation] = useState(null);

  /* 🌍 Auto-detect location on mount using backend endpoint */
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // ✅ Use backend endpoint for REAL-TIME IP-based geolocation (works with VPN)
        console.log("🌍 Detecting location via backend IP detection...");
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await axios.get(`${API_BASE}/api/geolocation`, {
          timeout: 8000
        });
        const data = response.data;
        
        console.log("📍 Real-time Geolocation Data:", {
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          ip: data.ip,
          success: data.success
        });

        // ✅ Map country codes to database location names
        const countryToLocationMap = {
          "IN": "India",
          "US": "United States",
          "CA": "Canada",
          "GB": "United Kingdom",
          "DE": "Germany",
          "FR": "France",
          "NL": "Netherlands",
          "ES": "Spain",
          "IT": "Italy",
          "AU": "Australia",
          "NZ": "New Zealand",
          "CN": "China",
          "JP": "Japan",
          "KR": "South Korea",
          "SG": "Singapore",
          "AE": "UAE",
          "SA": "Saudi Arabia",
        };
        
        const countryCode = data.countryCode || "IN";
        const mappedLocation = countryToLocationMap[countryCode] || data.country || "India";
        
        console.log("✅ Location mapped:", {
          countryCode,
          country: data.country,
          mappedTo: mappedLocation
        });

        setLocation(mappedLocation);
      } catch (err) {
        console.error("❌ Real-time location detection failed:", err.message);
        
        // ✅ Fallback 1: Try cached location from localStorage
        const cachedLocation = getFallbackLocation();
        if (cachedLocation && cachedLocation !== LOCATION_FALLBACK_DEFAULT) {
          console.log("💾 Using cached location:", cachedLocation);
          setLocation(cachedLocation);
          return;
        }
        
        console.log("🔄 Using default location: India");
        // ✅ Fallback 2: Default to India if all else fails
        setLocation("India");
      }
    };

    detectLocation();
  }, []);

  /* 🏷 Fetch price data whenever location is detected */
  useEffect(() => {
    if (!location) return;

    const fetchPriceData = async () => {
      try {
        console.log("📦 Fetching price data for:", location);
        const data = await getUpdatePricesByLocation(location);

        // ✅ Check if request was successful
        if (data && data.success === false) {
          console.warn("⚠️ Location not found in database:", location);
          // ✅ Default to INR with no conversion if location not found
          setPriceIncrease(0);
          setToConvert(1);
          setCurrency('INR');
          setResolvedLocation(location);
          return;
        }

        // Backend returns { percentage, currency } directly (no success field)
        if (data && data.percentage !== undefined) {
          console.log("✅ Price data received:", {
            location: location,
            percentage: data.percentage,
            currency: data.currency,
            currencyCode: data.currency?.country,
            conversionRate: data.currency?.toconvert
          });
          
          // ✅ Validate conversion rate
          const convRate = data.currency?.toconvert;
          if (!convRate || convRate <= 0) {
            console.error('❌ Invalid conversion rate:', convRate, '- Using default 1');
            setPriceIncrease(0);
            setToConvert(1);
            setCurrency('INR');
            setResolvedLocation(location);
            return;
          }
          
          setPriceIncrease(data.percentage);
          setToConvert(convRate);
          setCurrency(data.currency?.country || 'INR');
          setResolvedLocation(location);
          
          console.log("✅ Set conversion rate:", convRate);
          
          // ✅ Cache in localStorage for Cart.jsx fallback
          try {
            localStorage.setItem("locationPricing", JSON.stringify({
              location,
              percentage: data.percentage,
              currency: {
                code: data.currency?.country || 'INR',
                toconvert: convRate
              },
              timestamp: Date.now()
            }));
            console.log("💾 Cached location pricing in localStorage:", {
              location,
              code: data.currency?.country,
              toconvert: convRate
            });
          } catch (e) {
            console.warn("⚠️ Could not cache location pricing:", e);
          }
        } else {
          console.warn("⚠️ No price data for location:", location);
          // ✅ Default to INR with no conversion if location not found
          setPriceIncrease(0);
          setToConvert(1);
          setCurrency('INR');
          setResolvedLocation(location);
        }
      } catch (error) {
        console.error("❌ Error fetching price data:", error);
        // ✅ Default to INR on error
        setPriceIncrease(0);
        setToConvert(1);
        setCurrency('INR');
        setResolvedLocation(location);
      }
    };

    fetchPriceData();
  }, [location]);

  return (
    <PriceContext.Provider
      value={{
        toConvert,
        priceIncrease,
        currency,
        resolvedLocation,
        setLocation, // still exposed if you want manual override
      }}
    >
      {children}
    </PriceContext.Provider>
  );
};

export const usePriceContext = () => useContext(PriceContext);
