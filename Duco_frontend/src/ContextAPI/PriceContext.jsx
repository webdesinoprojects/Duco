// src/ContextAPI/PriceContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { getUpdatePricesByLocation } from "../Service/APIservice";

const PriceContext = createContext();

export const PriceProvider = ({ children }) => {
  const [toConvert, setToConvert] = useState(null); // conversion rate
  const [priceIncrease, setPriceIncrease] = useState(null); // % increase
  const [currency, setCurrency] = useState(null); // currency code (USD, INR, etc.)
  const [resolvedLocation, setResolvedLocation] = useState(null); // e.g. India
  const [location, setLocation] = useState(null); // detected country

  /* 🌍 Auto-detect location on mount using backend endpoint */
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // ✅ Check localStorage first for cached location
        const cached = JSON.parse(localStorage.getItem("locationPricing"));
        if (cached && cached.location) {
          console.log("💾 Using cached location from localStorage:", cached.location);
          setLocation(cached.location);
          return;
        }

        // ✅ Use backend endpoint for geolocation (no CORS issues)
        console.log("🌍 Detecting location via backend...");
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://duco-67o5.onrender.com';
        const response = await axios.get(`${API_BASE}/api/geolocation`, {
          timeout: 5000
        });
        const data = response.data;
        
        console.log("📍 Geolocation Data:", {
          country: data.country,
          countryCode: data.countryCode,
          city: data.city,
          ip: data.ip
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
        
        console.log("🗺️ Mapped location:", {
          countryCode,
          country: data.country,
          mappedTo: mappedLocation
        });

        setLocation(mappedLocation);
      } catch (err) {
        console.error("❌ Location detection failed:", err.message);
        
        // ✅ Fallback: Check localStorage for cached location
        try {
          const cached = JSON.parse(localStorage.getItem("locationPricing"));
          if (cached && cached.location) {
            console.log("💾 Fallback: Using cached location from localStorage:", cached.location);
            setLocation(cached.location);
            return;
          }
        } catch (e) {
          console.warn("⚠️ Could not read localStorage:", e);
        }
        
        console.log("🔄 Using default location: India");
        // ✅ Default to India if detection fails
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
