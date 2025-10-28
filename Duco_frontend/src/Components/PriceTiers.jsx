// src/Components/PriceTiers.jsx
import React from "react";

/**
 * PriceTiers Component
 * Props:
 * - tiers: Array<{ range: string, price: number, recommended?: boolean }>
 * - currencySymbol?: string (default: "₹")
 * - title?: string (default: "Price Chart")
 * - note?: string (optional small helper text)
 * - className?: string (optional extra classes for wrapper)
 */
export default function PriceTiers({
  tiers = [],
  currencySymbol = "₹",
  title = "Price Chart",
  note = "Pricing varies by quantity",
  className = "",
}) {
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
            Price Per Piece
          </th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((t, i) => (
          <tr key={i} className="odd:bg-black even:bg-slate-900">
            <td className="px-4 py-2 text-slate-200">{t.range}</td>
            <td className="px-4 py-2 text-slate-100 flex items-center gap-2">
              {currencySymbol}
              {Number(t.price).toLocaleString("en-IN")}
              {t.recommended && (
                <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700">
                  Recommended
                </span>
              )}
            </td>
          </tr>
        ))}
        {tiers.length === 0 && (
          <tr>
            <td colSpan={2} className="px-4 py-3 text-slate-500">
              No tiers configured.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

  );
}
