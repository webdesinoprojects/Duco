// src/Components/PriceTiers.jsx
import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

/**
 * PriceTiers Component - Dynamic Backend-Driven Price Chart
 * 
 * Fetches bulk discount tiers from admin settings and displays them dynamically.
 * No hardcoded values. Coupon codes are generated from discount percentage.
 */
export default function PriceTiers({
  title = "Bulk Discount Tiers",
  note = "Prices and discounts are based on order quantity",
  className = "",
}) {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchDiscountTiers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_BASE_URL}/api/corporate-settings/discount-tiers`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch discount tiers");
        }

        const data = await response.json();
        
        if (isMounted) {
          // Ensure data is an array and sort by minQuantity
          const sortedTiers = Array.isArray(data)
            ? data.sort((a, b) => a.minQuantity - b.minQuantity)
            : [];
          
          console.log('📊 Discount tiers loaded:', sortedTiers);
          setTiers(sortedTiers);
        }
      } catch (err) {
        if (isMounted && err.name !== "AbortError") {
          console.error('❌ Error fetching discont tiers:', err);
          setError(err);
          setTiers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDiscountTiers();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Generate coupon code from discount percentage
  const generateCouponCode = (discountPercent) => {
    return `DUCO${Math.round(discountPercent)}`;
  };

  // Format quantity range
  const formatQuantityRange = (minQty, maxQty) => {
    if (!maxQty || maxQty === Infinity) {
      return `${minQty}+`;
    }
    return `${minQty} - ${maxQty}`;
  };

  if (loading) {
    return (
      <div className={`rounded-2xl bg-black border mt-5 border-slate-700 p-2 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {note && <span className="text-slate-400" title={note}>ⓘ</span>}
        </div>
        <div className="px-4 py-6 text-center text-slate-400">
          Loading discount tiers...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-2xl bg-black border mt-5 border-slate-700 p-2 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="px-4 py-3 text-center text-amber-400 text-sm">
          Unable to load discount tiers. Please try again later.
        </div>
      </div>
    );
  }

  if (!tiers || tiers.length === 0) {
    return (
      <div className={`rounded-2xl bg-black border mt-5 border-slate-700 p-2 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="px-4 py-3 text-center text-slate-500 text-sm">
          No bulk discounts available.
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-black border mt-5 border-slate-700 p-2 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {note && <span className="text-slate-400" title={note}>ⓘ</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-slate-300">
                Quantity Range
              </th>
              <th className="text-left px-4 py-2 font-medium text-slate-300">
                Discount
              </th>
              <th className="text-left px-4 py-2 font-medium text-slate-300">
                Coupon Code
              </th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier, index) => {
              const couponCode = generateCouponCode(tier.discountPercentage);
              const quantityRange = formatQuantityRange(
                tier.minQuantity,
                tier.maxQuantity
              );

              return (
                <tr key={index} className="odd:bg-black even:bg-slate-900 hover:bg-slate-800/50 transition">
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {quantityRange} units
                  </td>
                  <td className="px-4 py-3 text-slate-100 font-semibold">
                    <span className="text-emerald-400">{tier.discountPercentage}%</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <code className="bg-slate-900 px-2 py-1 rounded text-amber-300 text-xs font-mono">
                      {couponCode}
                    </code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {note && (
        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
          <span>ℹ️</span>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}
