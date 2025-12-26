// InvoiceDucoTailwind.jsx — React + TailwindCSS invoice (A4), fully dynamic
// Usage:
//   import InvoiceDucoTailwind from "./InvoiceDucoTailwind";
//   <InvoiceDucoTailwind data={invoiceData} editable />

import React, { useMemo, useState } from "react";

// ---------- helpers ----------
const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const fmtINR = (n) => {
  const parts = Number(n || 0)
    .toFixed(2)
    .split(".");
  let x = parts[0];
  const last3 = x.slice(-3);
  const other = x.slice(0, -3);
  const withCommas =
    (other ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
  return `${withCommas}.${parts[1]}`;
};
const toWordsIndian = (amount) => {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  let num = Math.floor(Math.max(0, Number(amount || 0)));
  if (num === 0) return "Zero";
  const two = (n) =>
    n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
  const three = (n) =>
    n >= 100
      ? a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + two(n % 100) : "")
      : two(n);
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;
  let str = "";
  if (crore) str += three(crore) + " Crore ";
  if (lakh) str += three(lakh) + " Lakh ";
  if (thousand) str += three(thousand) + " Thousand ";
  if (hundred) str += three(hundred);
  return str.trim();
};

export default function InvoiceDucoTailwind({ data, editable = false }) {
  const base = typeof DEMO_INVOICE === "object" ? DEMO_INVOICE : {}; // eslint-disable-line no-undef
  const d = useMemo(() => ({ ...base, ...(data || {}) }), [base, data]);

  // local state for charges in edit mode
  const [pf, setPf] = useState(Number(d.charges?.pf || 0));
  const [printing, setPrinting] = useState(Number(d.charges?.printing || 0));
  const charges = editable
    ? { pf, printing }
    : {
        pf: Number(d.charges?.pf || 0),
        printing: Number(d.charges?.printing || 0),
      };

  const calc = useMemo(() => {
    const items = (d.items || []).map((it, i) => ({
      sno: it.sno ?? i + 1,
      description: it.description || "",
      barcode: it.barcode || "",
      hsn: it.hsn || "",
      qty: Number(it.qty || 0),
      unit: it.unit || "Pcs.",
      price: Number(it.price || 0),
    }));
    const sub = r2(items.reduce((s, it) => s + it.qty * it.price, 0));
    const pf = r2(Number(charges.pf || 0));
    const printing = r2(Number(charges.printing || 0));
    const taxable = r2(sub + pf + printing);

    // --- Determine tax type ---
    const normalize = (s) => (s || "").trim().toLowerCase();
    const companyState = normalize(d.company?.state);
    const supplyState = normalize(d.invoice?.placeOfSupply);
    const isSameState =
      companyState && supplyState && companyState === supplyState;

    let cgstRate = 0,
      sgstRate = 0,
      igstRate = 0,
      cgst = 0,
      sgst = 0,
      igst = 0;

    if (isSameState) {
      // within state
      cgstRate = 2.5;
      sgstRate = 2.5;
      cgst = r2((taxable * cgstRate) / 100);
      sgst = r2((taxable * sgstRate) / 100);
    } else {
      // interstate
      igstRate = 5;
      igst = r2((taxable * igstRate) / 100);
    }

    const grand = r2(taxable + cgst + sgst + igst);
    const totalQty = r2(items.reduce((s, it) => s + Number(it.qty || 0), 0));

    return {
      items,
      sub,
      pf,
      printing,
      taxable,
      cgstRate,
      sgstRate,
      igstRate,
      cgst,
      sgst,
      igst,
      grand,
      totalQty,
      isSameState,
    };
  }, [d, charges]);

  return (
    <div className="w-full min-h-screen bg-neutral-100 text-black print:bg-white">
      {/* ✅ Print sizing (A4) */}
      <style>{`@page{ size:A4; margin:10mm }`}</style>

      {/* Toolbar */}
      <div className="w-[210mm] mx-auto mt-12 mb-4 flex justify-end gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg border border-neutral-900 bg-neutral-900 text-white text-sm"
        >
          Download PDF
        </button>
      </div>

      {/* A4 page */}
      <div className="w-[210mm] min-h-[297mm] mx-auto my-12 bg-white border border-neutral-300 shadow p-[10mm] print:shadow-none print:my-0 print:border-0">
        {/* Company + Invoice Meta */}
        <div className="text-[12px]">
          <div>
            GSTIN : <strong>{d.company?.gstin}</strong>
          </div>
          <div className="mt-1 text-lg font-bold">{d.company?.name}</div>
          <div className="whitespace-pre-line">{d.company?.address}</div>
        </div>

        {/* Items table */}
        <table className="w-full border-collapse mt-4 text-[12px]">
          <thead>
            <tr>
              <th className="border p-1">S.N.</th>
              <th className="border p-1">Description</th>
              <th className="border p-1">HSN</th>
              <th className="border p-1">Qty</th>
              <th className="border p-1">Unit</th>
              <th className="border p-1">Price</th>
              <th className="border p-1">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {calc.items.map((it) => (
              <tr key={it.sno}>
                <td className="border p-1 text-center">{it.sno}</td>
                <td className="border p-1">{it.description}</td>
                <td className="border p-1 text-center">{it.hsn}</td>
                <td className="border p-1 text-center">{it.qty}</td>
                <td className="border p-1 text-center">{it.unit}</td>
                <td className="border p-1 text-right">{fmtINR(it.price)}</td>
                <td className="border p-1 text-right">
                  {fmtINR(it.qty * it.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 text-[12px] ml-auto w-[80mm]">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border p-1">Sub Total</td>
                <td className="border p-1 text-right">{fmtINR(calc.sub)}</td>
              </tr>
              <tr>
                <td className="border p-1">P&F Charges</td>
                <td className="border p-1 text-right">{fmtINR(calc.pf)}</td>
              </tr>
              <tr>
                <td className="border p-1">Printing</td>
                <td className="border p-1 text-right">
                  {fmtINR(calc.printing)}
                </td>
              </tr>

              {calc.isSameState ? (
                <>
                  <tr>
                    <td className="border p-1">Add: CGST @ {calc.cgstRate}%</td>
                    <td className="border p-1 text-right">
                      {fmtINR(calc.cgst)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-1">Add: SGST @ {calc.sgstRate}%</td>
                    <td className="border p-1 text-right">
                      {fmtINR(calc.sgst)}
                    </td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td className="border p-1">Add: IGST @ {calc.igstRate}%</td>
                  <td className="border p-1 text-right">{fmtINR(calc.igst)}</td>
                </tr>
              )}

              <tr className="font-bold">
                <td className="border p-1">Grand Total</td>
                <td className="border p-1 text-right">{fmtINR(calc.grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words */}
        <div className="mt-2 text-[12px] font-semibold">
          Rupees {toWordsIndian(calc.grand)} Only
        </div>
      </div>
    </div>
  );
}
