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

  /* 🌍 Auto-detect location on mount using IP-based geolocation (VPN-aware) */
  useEffect(() => {
    const detectLocation = async () => {
      try {
        // Remove hardcoded testing location
        
        // ✅ Use IP-based geolocation (works with VPN)
        console.log("🌍 Detecting location via IP...");
        const ipResponse = await axios.get("https://ipapi.co/json/");
        const data = ipResponse.data;
        
        console.log("📍 IP Geolocation Data:", {
          country: data.country_name,
          countryCode: data.country_code,
          city: data.city,
          continent: data.continent_code,
          ip: data.ip
        });

        // Map country to continent/region for backend
        const continentMapping = {
          "IN": "Asia",
          "US": "North America", 
          "CA": "North America",
          "GB": "Europe",
          "DE": "Europe",
          "FR": "Europe",
          "NL": "Europe", // Netherlands (Amsterdam)
          "ES": "Europe",
          "IT": "Europe",
          "AU": "Australia",
          "NZ": "Australia",
          "CN": "Asia",
          "JP": "Asia",
          "KR": "Asia",
          "SG": "Asia",
          "AE": "Asia", // UAE
          "SA": "Asia", // Saudi Arabia
        };

        const countryCode = data.country_code || data.country;
        const mappedLocation = continentMapping[countryCode] || data.country_name || "Unknown";
        
        console.log("🗺️ Mapped location:", {
          countryCode,
          countryName: data.country_name,
          mappedTo: mappedLocation
        });

        setLocation(mappedLocation);
      } catch (err) {
        console.error("❌ IP-based location detection failed:", err);
        console.log("🔄 Falling back to GPS geolocation...");
        
        // Fallback to GPS geolocation if IP detection fails
        if (!navigator.geolocation) {
          console.warn("❌ Geolocation not supported.");
          setLocation("Asia"); // Default fallback
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { latitude, longitude } = pos.coords;
              const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
              if (!apiKey) {
                console.error("❌ Missing Google API Key. Check your .env file.");
                setLocation("Asia"); // Default fallback
                return;
              }

              const geoURL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
              const res = await axios.get(geoURL);
              const results = res.data.results || [];

              let country = null;

              for (const result of results) {
                for (const comp of result.address_components) {
                  if (comp.types.includes("country")) {
                    country = comp.long_name;
                    break;
                  }
                }
                if (country) break;
              }

              if (country) {
                console.log("🌍 GPS Detected country:", country);
                setLocation(country);
              } else {
                console.warn("⚠️ No country found. Setting fallback: Asia");
                setLocation("Asia");
              }
            } catch (err) {
              console.error("❌ GPS Location detection failed:", err);
              setLocation("Asia");
            }
          },
          (err) => {
            console.warn("❌ Geolocation error:", err.message);
            setLocation("Asia");
          }
        );
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

        // Backend returns { percentage, currency } directly (no success field)
        if (data && data.percentage !== undefined) {
          console.log("✅ Price data received:", data);
          setPriceIncrease(data.percentage);
          setToConvert(data.currency?.toconvert || null);
          setCurrency(data.currency?.country || null);
          setResolvedLocation(location);
          
          // ✅ Cache in localStorage for Cart.jsx fallback
          try {
            localStorage.setItem("locationPricing", JSON.stringify({
              location,
              percentage: data.percentage,
              currency: {
                code: data.currency?.country || 'INR',
                toconvert: data.currency?.toconvert || 1
              },
              timestamp: Date.now()
            }));
            console.log("💾 Cached location pricing in localStorage");
          } catch (e) {
            console.warn("⚠️ Could not cache location pricing:", e);
          }
        } else {
          console.warn("⚠ No price data for location:", location);
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
