// src/Components/CropTankSizeChart.jsx
import React from "react";

export default function CropTankSizeChart({
  title = "Crop Tank Size Chart",
  product = "Crop Tank",
  sizes = ["XS", "S", "M", "L", "XL", "2XL"],
  rows = [
    { label: "Length (Inch)", values: [16.5, 17, 17.5, 18, 18.5, 19] },
    { label: "Waist (Inch)",  values: [28, 30, 32, 34, 36, 38] },
    { label: "Bust (Inch)",   values: [32, 34, 36, 38, 40, 42] },
  ],
  note = "All measurements are in inches",
  className = "",
}) {
  return (
    <section className={`w-full    mt-3 p-2  ${className}`}>
      {/* Card wrapper — same theme as PriceTiers */}
      <div className="rounded-2xl bg-black border mt-5 border-slate-700 p-2">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {note && <span className="text-slate-400" title={note}>ⓘ</span>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  {product}
                </th>
                {sizes.map((s) => (
                  <th
                    key={s}
                    className="px-4 py-3 font-medium text-slate-300 text-center"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className="odd:bg-black even:bg-slate-900">
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {row.label}
                  </td>
                  {row.values.map((v, idx) => (
                    <td key={idx} className="px-4 py-3 text-slate-100 text-center">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={sizes.length + 1} className="px-4 py-3 text-slate-500">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
