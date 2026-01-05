import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getInvoiceByOrder } from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext";
import { usePriceContext } from "../ContextAPI/PriceContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JsBarcode from "jsbarcode";

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

/* ----------------------------- INVOICE TEMPLATE ----------------------------- */
const InvoiceDucoTailwind = ({ data }) => {
  const {
    company,
    invoice,
    billTo,
    shipTo,
    items,
    charges,
    tax,
    subtotal,
    total,
    terms,
    forCompany,
    locationTax,
    currencySymbol = "₹", // ✅ Get currency symbol from data
    currency = "INR",
    paymentmode = "online", // ✅ Get payment mode
    amountPaid = 0, // ✅ Get amount paid (for 50% payments)
  } = data;
  // ✅ CRITICAL: Use the backend-calculated total directly
  // The backend has already calculated the correct total with proper tax logic
  const displayAmount = paymentmode === '50%' && amountPaid > 0 ? amountPaid : total;
  
  // ✅ Calculate total tax amount for display in tax breakdown table
  const totalTaxAmount = (() => {
    if (tax.type === "INTRASTATE") {
      return Number(tax.cgstAmount || 0) + Number(tax.sgstAmount || 0);
    }
    if (tax.type === "INTRASTATE_IGST") {
      return Number(tax.igstAmount || 0);
    }
    if (tax.type === "INTERSTATE") {
      return Number(tax.cgstAmount || 0) + Number(tax.sgstAmount || 0);
    }
    if (tax.type === "INTERNATIONAL") {
      return Number(tax.taxAmount || 0);
    }
    if (tax.type === "B2C_NO_TAX") {
      return 0;
    }
    // fallback (no tax.type)
    return (
      Number(tax.cgstAmount || 0) +
      Number(tax.sgstAmount || 0) +
      Number(tax.igstAmount || 0)
    );
  })();
  
  console.log("🧾 Invoice Template - Using backend total:", {
    total,
    amountPaid,
    paymentmode,
    displayAmount,
    tax
  });
  console.log("💱 Invoice Template - Currency:", currency, currencySymbol);
  console.log("💳 Invoice Template - Payment Mode:", paymentmode, "Amount Paid:", amountPaid);

  // Compute actual numeric location adjustment
  const locationAdj =
    locationTax?.percentage
      ? ((subtotal + (charges?.pf || 0) + (charges?.printing || 0)) *
          locationTax.percentage) /
        100
      : 0;

  const adjustedTotal = total + locationAdj;
  const totalInWords = numberToWords(Math.round(adjustedTotal));
  const currencyName = currencyNames[currency] || "Rupees";

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#000",
        backgroundColor: "#fff",
        padding: "20px",
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        border: "2px solid #000",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
        <div style={{ fontSize: "12px", fontWeight: "bold" }}>
          GSTIN : {company.gstin}
        </div>
        <div style={{ fontSize: "12px", fontWeight: "bold", textAlign: "right" }}>
          {invoice.copyType || "Original Copy"}
        </div>
      </div>

      {/* COMPANY NAME */}
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: "0 0 5px 0" }}>
          {company.name}
        </h1>
        <p style={{ fontSize: "11px", margin: "2px 0" }}>{company.address}</p>
        <p style={{ fontSize: "11px", margin: "2px 0" }}>CIN : {company.cin || "U52601CT2020PTC010997"}</p>
        <p style={{ fontSize: "11px", margin: "2px 0" }}>email : {company.email}</p>
      </div>

      <div style={{ border: "1px solid #000", marginBottom: "0" }}></div>

      {/* INVOICE DETAILS & PLACE OF SUPPLY */}
      <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
        <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #000" }}>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            <span>Invoice No.</span>
            <span style={{ marginLeft: "20px" }}>: {invoice.number}</span>
          </p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            <span>Dated</span>
            <span style={{ marginLeft: "52px" }}>: {invoice.date}</span>
          </p>
        </div>
        <div style={{ flex: 1, padding: "8px" }}>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            <span>Place of Supply</span>
            <span style={{ marginLeft: "10px" }}>: {invoice.placeOfSupply}</span>
          </p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>
            <span>Reverse Charge</span>
            <span style={{ marginLeft: "10px" }}>: N</span>
          </p>
        </div>
      </div>

      {/* BILLED TO & SHIPPED TO */}
      <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
        <div style={{ flex: 1, padding: "8px", borderRight: "1px solid #000", minHeight: "100px" }}>
          <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "bold" }}>Billed to :</p>
          <p style={{ margin: "2px 0", fontSize: "11px", fontWeight: "bold" }}>{billTo.name}</p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>{billTo.address}</p>
          {billTo.gstin && (
            <p style={{ margin: "5px 0 0 0", fontSize: "11px" }}>
              GSTIN / UIN : {billTo.gstin}
            </p>
          )}
        </div>
        <div style={{ flex: 1, padding: "8px", minHeight: "100px" }}>
          <p style={{ margin: "0 0 5px 0", fontSize: "11px", fontWeight: "bold" }}>Shipped to :</p>
          <p style={{ margin: "2px 0", fontSize: "11px", fontWeight: "bold" }}>{shipTo?.name || billTo.name}</p>
          <p style={{ margin: "2px 0", fontSize: "11px" }}>{shipTo?.address || billTo.address}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000", backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "left", width: "30px" }}>S.N.</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "left" }}>Description of Goods</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "80px" }}>BARCODE</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "60px" }}>HSN</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "80px" }}>Qty. Unit</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "right", width: "70px" }}>Price</th>
            <th style={{ border: "1px solid #000", padding: "6px", textAlign: "right", width: "90px" }}>Amount ( )</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{i + 1}</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>
                {it.description}
                {it.printSides && it.printSides > 0 ? ` (${it.printSides} sides printing)` : ""}
              </td>
              <td style={{ border: "1px solid #000", padding: "2px", textAlign: "center" }}>
                <BarcodeImage value={it.barcode || "000002"} />
              </td>
              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                {it.hsn || "4901101"}
              </td>
              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                {it.qty} {it.unit}
              </td>
              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                {Number(it.price).toFixed(2)}
              </td>
              <td style={{ border: "1px solid #000", padding: "6px", textAlign: "right" }}>
                {(it.qty * it.price).toFixed(2)}
              </td>
            </tr>
          ))}
          {/* Empty rows for spacing */}
          {[...Array(Math.max(0, 5 - items.length))].map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: "40px" }}>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "6px" }}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TAX SUMMARY */}
      <div style={{ display: "flex", borderTop: "1px solid #000" }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ width: "350px" }}>
          <table style={{ width: "100%", fontSize: "11px" }}>
            <tbody>
              <tr>
                <td style={{ padding: "4px", width: "40%" }}></td>
                <td style={{ padding: "4px", textAlign: "center", width: "60%", fontWeight: "bold" }}>Total Tax</td>
              </tr>
              <tr>
                <td style={{ padding: "4px" }}>Sub Total</td>
                <td style={{ padding: "4px", textAlign: "center" }}>-</td>
              </tr>
              
              {/* ✅ P&F Charges Row - Show only if charges exist */}
              {(charges?.pf || 0) > 0 && (
                <tr>
                  <td style={{ padding: "4px" }}>P&F Charges</td>
                  <td style={{ padding: "4px", textAlign: "right" }}>{(charges?.pf || 0).toFixed(2)}</td>
                </tr>
              )}
              
              {/* ✅ Printing Charges Row - Show only if charges exist */}
              {(charges?.printing || 0) > 0 && (
                <tr>
                  <td style={{ padding: "4px" }}>Printing</td>
                  <td style={{ padding: "4px", textAlign: "right" }}>{(charges?.printing || 0).toFixed(2)}</td>
                </tr>
              )}
              
              {/* Show IGST only for same state (Chhattisgarh) - INTRASTATE_IGST */}
              {tax.type === 'INTRASTATE_IGST' && (
                <tr>
                  <td style={{ padding: "4px" }}>Add : IGST</td>
                  <td style={{ padding: "4px", textAlign: "center" }}>{tax.igstAmount.toFixed(2)}</td>
                </tr>
              )}
              
              {/* Show CGST + SGST + IGST for old INTRASTATE type (backward compatibility) */}
              {tax.type === 'INTRASTATE' && (
                <>
                  <tr>
                    <td style={{ padding: "4px" }}>Add : CGST</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>{tax.cgstAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px" }}>Add : SGST</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>{tax.sgstAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px" }}>Add : IGST</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>{tax.igstAmount.toFixed(2)}</td>
                  </tr>
                </>
              )}
              
              {/* Show CGST + SGST for different state in India (INTERSTATE) */}
              {tax.type === 'INTERSTATE' && (
                <>
                  <tr>
                    <td style={{ padding: "4px" }}>Add : CGST</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>{tax.cgstAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px" }}>Add : SGST</td>
                    <td style={{ padding: "4px", textAlign: "center" }}>{tax.sgstAmount.toFixed(2)}</td>
                  </tr>
                </>
              )}
              
              {/* Show TAX for international */}
              {tax.type === 'INTERNATIONAL' && (
                <tr>
                  <td style={{ padding: "4px" }}>Add : TAX</td>
                  <td style={{ padding: "4px", textAlign: "center" }}>{tax.taxAmount.toFixed(2)}</td>
                </tr>
              )}
              
              {/* Fallback for old invoices without type */}
              {!tax.type && (
                <>
                  {tax.cgstRate > 0 && (
                    <tr>
                      <td style={{ padding: "4px" }}>Add : CGST</td>
                      <td style={{ padding: "4px", textAlign: "center" }}>{tax.cgstAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {tax.sgstRate > 0 && (
                    <tr>
                      <td style={{ padding: "4px" }}>Add : SGST</td>
                      <td style={{ padding: "4px", textAlign: "center" }}>{tax.sgstAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  {tax.igstRate > 0 && (
                    <tr>
                      <td style={{ padding: "4px" }}>Add : IGST</td>
                      <td style={{ padding: "4px", textAlign: "center" }}>{tax.igstAmount.toFixed(2)}</td>
                    </tr>
                  )}
                </>
              )}
              
              {/* Round off - always added */}
              {Math.abs(Math.ceil(adjustedTotal) - adjustedTotal) > 0.01 && (
                <tr>
                  <td style={{ padding: "4px" }}>Round Off</td>
                  <td style={{ padding: "4px", textAlign: "center" }}>+{(Math.ceil(adjustedTotal) - adjustedTotal).toFixed(2)}</td>
                  <td style={{ padding: "4px", textAlign: "right" }}>{Math.ceil(adjustedTotal).toFixed(2)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid #000", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: "6px" }}>
                  {paymentmode === '50%' ? 'Amount Paid (50% Advance)' : 'Grand Total'}
                </td>
                <td style={{ padding: "6px", textAlign: "center" }}>
                  {items.reduce((sum, it) => sum + Number(it.qty), 0)} {items[0]?.unit || "Pcs"}.
                </td>
                <td style={{ padding: "6px", textAlign: "right" }}>{displayAmount.toFixed(2)}</td>
              </tr>
              
              {/* ✅ Show remaining amount due for 50% payments */}
              {paymentmode === '50%' && (
                <tr style={{ fontWeight: "bold", backgroundColor: "#fff3cd" }}>
                  <td style={{ padding: "6px" }}>Amount Due (50% Remaining)</td>
                  <td style={{ padding: "6px", textAlign: "center" }}>-</td>
                  <td style={{ padding: "6px", textAlign: "right" }}>{displayAmount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>{/* TAX BREAKDOWN TABLE */}
<table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "11px",
    marginTop: "10px",
    border: "1px solid #000",
  }}
>
  <thead>
    <tr style={{ backgroundColor: "#f5f5f5" }}>
      <th style={{ border: "1px solid #000", padding: "4px" }}>Tax Rate</th>
      <th style={{ border: "1px solid #000", padding: "4px" }}>Total Tax</th>
      {/* INTRASTATE_IGST: Chhattisgarh - IGST only */}
      {tax.type === "INTRASTATE_IGST" && (
        <th style={{ border: "1px solid #000", padding: "4px" }}>IGST Amt.</th>
      )}
      {/* INTRASTATE: Old format with CGST+SGST+IGST */}
      {tax.type === "INTRASTATE" && (
        <>
          <th style={{ border: "1px solid #000", padding: "4px" }}>CGST Amt.</th>
          <th style={{ border: "1px solid #000", padding: "4px" }}>SGST Amt.</th>
          <th style={{ border: "1px solid #000", padding: "4px" }}>IGST Amt.</th>
        </>
      )}
      {/* INTERSTATE: Other Indian states - CGST+SGST */}
      {tax.type === "INTERSTATE" && (
        <>
          <th style={{ border: "1px solid #000", padding: "4px" }}>CGST Amt.</th>
          <th style={{ border: "1px solid #000", padding: "4px" }}>SGST Amt.</th>
        </>
      )}
      {tax.type === "INTERNATIONAL" && (
        <th style={{ border: "1px solid #000", padding: "4px" }}>TAX Amt.</th>
      )}
      {!tax.type && (
        <>
          <th style={{ border: "1px solid #000", padding: "4px" }}>CGST Amt.</th>
          <th style={{ border: "1px solid #000", padding: "4px" }}>SGST Amt.</th>
        </>
      )}
      <th style={{ border: "1px solid #000", padding: "4px" }}>
        Amount (Incl. Tax)
      </th>
    </tr>
  </thead>

  <tbody>
    <tr>
      {/* Tax Rate */}
      <td
        style={{
          border: "1px solid #000",
          padding: "4px",
          textAlign: "center",
        }}
      >
        {tax.type === "INTRASTATE_IGST" && `${tax.igstRate || 5}%`}
        {tax.type === "INTRASTATE" &&
          `${(tax.cgstRate || 0) + (tax.sgstRate || 0) + (tax.igstRate || 0)}%`}
        {tax.type === "INTERSTATE" && `${(tax.cgstRate || 0) + (tax.sgstRate || 0)}%`}
        {tax.type === "INTERNATIONAL" && `${tax.taxRate || 1}%`}
        {!tax.type &&
          `${(tax.cgstRate || 0) + (tax.sgstRate || 0) + (tax.igstRate || 0)}%`}
      </td>

      {/* 2nd column: Total Tax */}
      <td
        style={{
          border: "1px solid #000",
          padding: "4px",
          textAlign: "right",
        }}
      >
        {totalTaxAmount.toFixed(2)}
      </td>

      {/* INTRASTATE_IGST: Chhattisgarh - IGST only */}
      {tax.type === "INTRASTATE_IGST" && (
        <td
          style={{
            border: "1px solid #000",
            padding: "4px",
            textAlign: "right",
          }}
        >
          {Number(tax.igstAmount || 0).toFixed(2)}
        </td>
      )}

      {/* INTRASTATE: Old format with CGST+SGST+IGST */}
      {tax.type === "INTRASTATE" && (
        <>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.cgstAmount || 0).toFixed(2)}
          </td>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.sgstAmount || 0).toFixed(2)}
          </td>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.igstAmount || 0).toFixed(2)}
          </td>
        </>
      )}

      {/* INTERSTATE: Other Indian states - CGST+SGST */}
      {tax.type === "INTERSTATE" && (
        <>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.cgstAmount || 0).toFixed(2)}
          </td>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.sgstAmount || 0).toFixed(2)}
          </td>
        </>
      )}

      {tax.type === "INTERNATIONAL" && (
        <td
          style={{
            border: "1px solid #000",
            padding: "4px",
            textAlign: "right",
          }}
        >
          {Number(tax.taxAmount || 0).toFixed(2)}
        </td>
      )}

      {!tax.type && (
        <>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.cgstAmount || 0).toFixed(2)}
          </td>
          <td
            style={{
              border: "1px solid #000",
              padding: "4px",
              textAlign: "right",
            }}
          >
            {Number(tax.sgstAmount || 0).toFixed(2)}
          </td>
        </>
      )}

      {/* Last column: Amount including tax */}
      <td
        style={{
          border: "1px solid #000",
          padding: "4px",
          textAlign: "right",
        }}
      >
        {total.toFixed(2)}
      </td>
    </tr>
  </tbody>
</table>

      {/* AMOUNT IN WORDS */}
      <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "10px" }}>
        {currencyName} {numberToWords(Math.round(displayAmount))} Only{paymentmode === '50%' ? ' (50% Advance)' : ''}
      </div>

      {/* TERMS & SIGNATURE */}
      <div style={{ display: "flex", marginTop: "10px", minHeight: "120px" }}>
        <div style={{ flex: 1, fontSize: "10px", paddingRight: "10px" }}>
          <p style={{ fontWeight: "bold", marginBottom: "5px" }}>Terms & Conditions</p>
          <p style={{ margin: "2px 0" }}>E.& O.E.</p>
          {terms.map((t, i) => (
            <p key={i} style={{ margin: "2px 0" }}>{i + 1}. {t}</p>
          ))}
        </div>
        <div style={{ width: "250px", textAlign: "right", paddingTop: "60px" }}>
          <p style={{ fontSize: "11px", fontWeight: "bold", marginBottom: "5px" }}>
            For {forCompany}
          </p>
          <p style={{ fontSize: "10px", marginTop: "30px" }}>Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + numberToWords(num % 10000000) : '');
}

/* ------------------------------ ORDER SUCCESS ------------------------------ */
export default function OrderSuccess() {
  const { orderId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceData, setInvoiceData] = useState(null);
  const { clearCart } = useCart();
  const { currency, toConvert, priceIncrease } = usePriceContext();
  const invoiceRef = useRef();

  const orderId = paramId || localStorage.getItem("lastOrderId");
  const storedMeta = JSON.parse(localStorage.getItem("lastOrderMeta") || "{}");

  const paymentMeta =
    location.state?.paymentMeta ||
    storedMeta ||
    {};
  const paymentMethod =
    paymentMeta.mode === "store_pickup"
      ? "Pay on Store (Pickup)"
      : paymentMeta.mode === "netbanking"
      ? "Netbanking / UPI"
      : "Pay Online";
  const isB2B = paymentMeta?.isCorporate || false;

  // ✅ Get currency symbol
  const currencySymbol = currencySymbols[currency] || "₹";
  const isInternational = currency && currency !== 'INR';

  console.log("💳 Payment Mode:", paymentMethod);
  console.log("🏢 Order Type:", isB2B ? "B2B" : "B2C");
  console.log("💱 Currency:", currency, "Symbol:", currencySymbol, "International:", isInternational);

  /* ✅ FIXED INVOICE LOGIC: accurate charges + gst like cart + side printing info */
  useEffect(() => {
    let isMounted = true;
    
    async function fetchInvoice() {
      try {
        if (!orderId) throw new Error("No Order ID found");

        const res = await getInvoiceByOrder(orderId);
        
        if (!isMounted) return; // Prevent state update if unmounted
        
        const inv = res?.invoice;
        if (!inv) throw new Error("No invoice found");

        const items = inv.items?.map((it, i) => ({
          ...it,
          sno: i + 1,
          printSides: it.printSides || it.sides || 0,
        })) || [];

        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
          0
        );

        // ✅ Extract charges from invoice, with fallback to order data
        let pf = Number(inv.charges?.pf ?? inv.pfCharges ?? 0);
        let printing = Number(inv.charges?.printing ?? inv.printingCharges ?? 0);
        
        // ✅ If charges are 0, try to get from order object
        if (pf === 0 && inv.order) {
          pf = Number(inv.order.pf ?? 0);
        }
        if (printing === 0 && inv.order) {
          printing = Number(inv.order.printing ?? 0);
        }
        
        // ✅ If still 0, calculate based on quantity (fallback)
        if (pf === 0 || printing === 0) {
          const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
          if (pf === 0) {
            pf = 15; // Fixed P&F charge
          }
          if (printing === 0) {
            // Calculate printing based on items with print sides
            printing = items.reduce((sum, item) => {
              const sides = item.printSides || 0;
              const qty = Number(item.qty || 0);
              return sum + (qty * sides * 15); // ₹15 per side
            }, 0);
          }
        }
        
        console.log('💰 Invoice Charges Debug:', {
          invCharges: inv.charges,
          pf,
          printing,
          orderPf: inv.order?.pf,
          orderPrinting: inv.order?.printing,
          calculatedFromItems: printing > 0
        });

        // ✅ CRITICAL FIX: Use backend total directly instead of recalculating
        // The backend has already calculated the correct total with proper tax logic
        const total = Number(inv.total ?? inv.totalPay) || 0;
        
        // ✅ Extract tax information from backend (already calculated correctly)
        const gstRate = inv.tax?.igstRate ?? inv.tax?.gstRate ?? inv.gstRate ?? 5;
        const gstTotal = inv.tax?.igstAmount ?? inv.tax?.totalTax ?? inv.gstTotal ?? 0;

        const cgstRate = inv.tax?.cgstRate ?? gstRate / 2;
        const sgstRate = inv.tax?.sgstRate ?? gstRate / 2;
        const cgstAmount = inv.tax?.cgstAmount ?? 0;
        const sgstAmount = inv.tax?.sgstAmount ?? 0;

        // ✅ Add location-based adjustment
        const locationTax = inv.locationTax || paymentMeta.locationTax || null;
        const locationAdj =
          locationTax?.percentage
            ? ((subtotal + pf + printing) * locationTax.percentage) / 100
            : 0;

        const formatted = {
          ...inv,
          items,
          charges: { pf, printing },
          tax: inv.tax || { cgstRate, sgstRate, cgstAmount, sgstAmount }, // ✅ Use tax from backend if available
          subtotal,
          total,
          locationTax,
          currency: currency || 'INR', // ✅ Add currency
          currencySymbol: currencySymbol, // ✅ Add currency symbol
          conversionRate: toConvert || 1, // ✅ Add conversion rate
          paymentmode: inv.paymentmode || paymentMeta.mode || 'online', // ✅ Add payment mode
          amountPaid: inv.amountPaid || 0, // ✅ Add amount paid (for 50% payments)
        };

        console.log("🧾 Normalized Invoice for Success Page:", formatted);
        console.log("💱 Tax Info:", formatted.tax);
        
        if (isMounted) {
          setInvoiceData(formatted);
          clearCart();
        }
      } catch (err) {
        console.error("Error fetching invoice:", err);
        if (isMounted) {
          navigate("/");
        }
      }
    }
    
    fetchInvoice();
    
    return () => {
      isMounted = false;
    };
  }, [orderId]); // Only depend on orderId

  // ✅ PDF DOWNLOAD
  const downloadPDF = async () => {
    const input = invoiceRef.current;
    if (!input) return;
    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const marginX = (pageWidth - imgWidth) / 2;

    pdf.addImage(imgData, "PNG", marginX, 10, imgWidth, imgHeight);
    pdf.save(`Invoice_${orderId}.pdf`);
  };

  if (!invoiceData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading your order…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl text-center mb-10">
        <h1 className="text-2xl font-bold text-green-600">
          ✅ Thank you for buying from DucoArt.com!
        </h1>
        <p className="mt-2 text-gray-700">
          Your order <span className="font-semibold">#{orderId}</span> has been
          placed successfully. A confirmation email & invoice have been sent to
          your registered email address.
        </p>

        {/* 🧾 Show Payment Mode and Order Type */}
        <div className="mt-4 p-3 bg-gray-100 border rounded-lg text-gray-800 text-sm inline-block">
          <p>
            <b>Payment Method:</b> {paymentMethod}
          </p>
          <p>
            <b>Order Type:</b> {isB2B ? "Corporate (B2B)" : "Retail (B2C)"}
          </p>
          <p>
            <b>P&F Charges:</b> {currencySymbol}{invoiceData.charges.pf.toFixed(2)} |{" "}
            <b>Printing:</b> {currencySymbol}{invoiceData.charges.printing.toFixed(2)} |{" "}
            <b>{invoiceData.tax?.type === 'INTERNATIONAL' ? 'TAX (1%)' : 'GST (5%)'}:</b> {currencySymbol}
            {invoiceData.tax?.type === 'INTERNATIONAL' 
              ? (invoiceData.tax.taxAmount || 0).toFixed(2)
              : ((invoiceData.tax.cgstAmount || 0) + (invoiceData.tax.sgstAmount || 0) + (invoiceData.tax.igstAmount || 0)).toFixed(2)}
          </p>
          {invoiceData.locationTax?.percentage ? (
            <p>
              <b>Location Adjustment:</b>{" "}
              +{invoiceData.locationTax.percentage}% (
              {invoiceData.locationTax.country})
            </p>
          ) : null}
          <p>
            <b>Grand Total:</b> {currencySymbol}{invoiceData.total.toFixed(2)}
          </p>
        </div>

        <button
          onClick={downloadPDF}
          className="mt-4 px-6 py-2 rounded-lg bg-black text-white hover:opacity-90 cursor-pointer"
        >
          Download Invoice (PDF)
        </button>
      </div>

      <div
        ref={invoiceRef}
        className="bg-white shadow-lg rounded-lg p-4 overflow-hidden"
      >
        <InvoiceDucoTailwind data={invoiceData} />
      </div>
    </div>
  );
}
