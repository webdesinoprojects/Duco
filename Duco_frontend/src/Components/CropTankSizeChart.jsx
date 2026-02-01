// src/Components/CropTankSizeChart.jsx
import React from "react";

// Size chart data for different product types
const SIZE_CHARTS = {
  cropTank: {
    title: "Crop Tank Size Chart",
    product: "Crop Tank",
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    rows: [
      { label: "Length (Inch)", values: [16.5, 17, 17.5, 18, 18.5, 19] },
      { label: "Waist (Inch)", values: [28, 30, 32, 34, 36, 38] },
      { label: "Bust (Inch)", values: [32, 34, 36, 38, 40, 42] },
    ],
    note: "All measurements are in inches",
  },
  mensRoundNeck: {
    title: "Men's Round Neck Half Sleeve",
    product: "Size",
    sizes: ["S", "M", "L", "XL", "2XL", "3XL", "4XL"],
    rows: [
      { label: "CHEST", values: [38, 40, 42, 44, 46, 48, 50] },
      { label: "LENGTH", values: [26, 27, 28, 29, 30, 31, 32] },
      { label: "SHOULDER", values: [15.5, 16.5, 17.5, 18.5, 19.5, 20.5, 21.5] },
      { label: "SLEEVE LENGTH", values: [7.5, 8, 8, 8.5, 9, 9.5, 10] },
      { label: "SLEEVE OPEN", values: [5.5, 6, 6.5, 7, 7.5, 8, 8.5] },
    ],
    note: "All measurements are in inches",
  },
};

export default function CropTankSizeChart({
  type = "cropTank", // "cropTank" or "mensRoundNeck"
  title,
  product,
  sizes,
  rows,
  note,
  className = "",
}) {
  // Use provided props or fallback to predefined data
  const chartData = SIZE_CHARTS[type] || SIZE_CHARTS.cropTank;
  const displayTitle = title || chartData.title;
  const displayProduct = product || chartData.product;
  const displaySizes = sizes || chartData.sizes;
  const displayRows = rows || chartData.rows;
  const displayNote = note || chartData.note;

  return (
    <section className={`w-full mt-3 p-2 ${className}`}>
      {/* Card wrapper — same theme as PriceTiers */}
      <div className="rounded-2xl bg-black border mt-5 border-slate-700 p-2">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-white">{displayTitle}</h2>
          {displayNote && (
            <span className="text-slate-400" title={displayNote}>
              ⓘ
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-300">
                  {displayProduct}
                </th>
                {displaySizes.map((s) => (
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
              {displayRows.map((row, i) => (
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

              {displayRows.length === 0 && (
                <tr>
                  <td
                    colSpan={displaySizes.length + 1}
                    className="px-4 py-3 text-slate-500"
                  >
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
