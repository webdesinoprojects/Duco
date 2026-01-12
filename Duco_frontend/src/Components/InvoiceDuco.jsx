// InvoiceDucoTailwind.jsx — React + TailwindCSS invoice (A4), fully dynamic
// Usage:
//   import InvoiceDucoTailwind from "./InvoiceDucoTailwind";
//   <InvoiceDucoTailwind data={invoiceData} editable />

import React, { useMemo, useState, useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";

// Currency names map for invoice text
const currencyNames = {
  INR: "Rupees",
  USD: "Dollars",
  EUR: "Euros",
  AED: "Dirhams",
  GBP: "Pounds",
  AUD: "Australian Dollars",
  CAD: "Canadian Dollars",
  SGD: "Singapore Dollars",
};

// Currency symbols map
const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  AED: "د.إ",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
};

// ---------- helpers ----------
const r2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const fmtINR = (n) => {
  const parts = Number(n || 0).toFixed(2).split(".");
  let x = parts[0];
  const last3 = x.slice(-3);
  const other = x.slice(0, -3);
  const withCommas =
    (other ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3;
  return `${withCommas}.${parts[1]}`;
};
/* ----------------------------- BARCODE COMPONENT ----------------------------- */
const BarcodeImage = ({ value }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: 1,
          height: 30,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "30px" }} />;
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
    n < 20
      ? a[n]
      : b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
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
  
  // Get currency info
  const currency = d.currency || 'INR';
  const currencySymbol = currencySymbols[currency] || "₹";
  const currencyName = currencyNames[currency] || "Rupees";

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

    // ✅ Check if this is a B2B order
    const orderType = d.orderType || 'B2C';
    const isB2B = orderType === 'B2B';

    // --- Determine tax type ---
    const normalize = (s) => (s || "").trim().toLowerCase();
    const companyState = normalize(d.company?.state);
    const supplyState = normalize(d.invoice?.placeOfSupply);
    const billToCountry = normalize(d.billTo?.country || d.invoice?.country || '');
    
    // ✅ Check if this is an international order (outside India)
    const isInternational = billToCountry && 
      billToCountry !== 'india' && 
      billToCountry !== 'bharat' && 
      billToCountry !== 'in' &&
      !billToCountry.includes('india') &&
      !billToCountry.includes('bharat');
    
    // ✅ Check if supply state is Chhattisgarh (home state)
    const isHomeState = supplyState && (
      supplyState.includes('chhattisgarh') || 
      supplyState.includes('chattisgarh') || 
      supplyState === 'cg' || 
      supplyState === 'c.g'
    );

    let cgstRate = 0,
      sgstRate = 0,
      igstRate = 0,
      taxRate = 0,
      cgst = 0,
      sgst = 0,
      igst = 0,
      tax = 0;

    // ✅ Only apply tax for B2B orders
    if (isB2B) {
      if (isInternational) {
        // International order: 1% TAX only
        taxRate = 1;
        tax = r2((taxable * taxRate) / 100);
        console.log("🌍 International order: 1% TAX applied");
      } else if (isHomeState) {
        // Home state (Chhattisgarh): 5% IGST only
        igstRate = 5;
        igst = r2((taxable * igstRate) / 100);
        console.log("🏠 Home state (Chhattisgarh): 5% IGST applied");
      } else {
        // Outside home state: 2.5% CGST + 2.5% SGST = 5% total
        cgstRate = 2.5;
        sgstRate = 2.5;
        cgst = r2((taxable * cgstRate) / 100);
        sgst = r2((taxable * sgstRate) / 100);
        console.log("🚚 Outside home state: 2.5% CGST + 2.5% SGST applied");
      }
    }
    // ✅ B2C: No tax (all rates remain 0)

    const grand = r2(taxable + cgst + sgst + igst + tax);
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
      taxRate,
      cgst,
      sgst,
      igst,
      tax,
      grand,
      totalQty,
      isB2B,
      orderType,
      isInternational,
      isHomeState,
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
              <th className="border p-1">BARCODE</th>
              <th className="border p-1">HSN</th>
              <th className="border p-1">Qty</th>
              <th className="border p-1">Unit</th>
              <th className="border p-1">Price</th>
              <th className="border p-1">Amount ({currencySymbol})</th>
            </tr>
          </thead>
          <tbody>
            {calc.items.map((it) => (
              <tr key={it.sno}>
                <td className="border p-1 text-center">{it.sno}</td>
                <td className="border p-1">{it.description}</td>
                <td className="border p-1 text-center">
                  <BarcodeImage value={it.barcode || "000002"} />
                </td>
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
        <div className="mt-4 text-[12px] ml-auto w-[110mm]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1 text-left w-[70%]">Description</th>
                <th className="border p-1 text-center w-[30%]">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-1">Sub Total</td>
                <td className="border p-1 text-center">-</td>
              </tr>
              {/* ✅ P&F Charges - Show only for B2B */}
              {calc.isB2B && calc.pf > 0 && (
                <tr>
                  <td className="border p-1">P&F Charges</td>
                  <td className="border p-1 text-center">-</td>
                </tr>
              )}
              {/* ✅ Printing - Show only for B2B */}
              {calc.isB2B && calc.printing > 0 && (
                <tr>
                  <td className="border p-1">Printing</td>
                  <td className="border p-1 text-center">-</td>
                </tr>
              )}

              {/* ✅ Only show tax for B2B orders */}
              {calc.isB2B && (
                calc.isInternational ? (
                  <tr>
                    <td className="border p-1">
                      Add: TAX
                    </td>
                    <td className="border p-1 text-center">
                      {fmtINR(calc.tax)}
                    </td>
                  </tr>
                ) : calc.isHomeState ? (
                  <tr>
                    <td className="border p-1">
                      Add: IGST
                    </td>
                    <td className="border p-1 text-center">
                      {fmtINR(calc.igst)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="border p-1">
                        Add: CGST
                      </td>
                      <td className="border p-1 text-center">
                        {fmtINR(calc.cgst)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border p-1">
                        Add: SGST
                      </td>
                      <td className="border p-1 text-center">
                        {fmtINR(calc.sgst)}
                      </td>
                    </tr>
                  </>
                )
              )}

              <tr className="font-bold bg-gray-100">
                <td className="border p-1">Grand Total</td>
                <td className="border p-1 text-center">
                  {fmtINR(calc.grand)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in words */}
        <div className="mt-2 text-[12px] font-semibold">
          {currencyName} {toWordsIndian(calc.grand)} Only
        </div>
      </div>
    </div>
  );
}
