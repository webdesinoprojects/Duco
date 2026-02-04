import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

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

const BarcodeImage = ({ value }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          width: 1,
          height: 25,
          displayValue: false,
          margin: 0,
        });
      } catch (err) {
        console.error("Barcode generation error:", err);
      }
    }
  }, [value]);

  return <canvas ref={canvasRef} style={{ maxWidth: "100%", height: "25px" }} />;
};

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

export const InvoiceTemplate = ({ data }) => {
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
    currencySymbol = "₹",
    currency = "INR",
    paymentmode = "online",
    amountPaid = 0,
    additionalFilesMeta = [], // ✅ Add files metadata
    paymentCurrency = "INR", // ✅ Add payment currency
    customerCountry = "India", // ✅ Add customer country
    customerCity = "", // ✅ Add customer city
    customerState = "", // ✅ Add customer state
    conversionRate = 1, // ✅ Add conversion rate
  } = data;

  const displayAmount = paymentmode === '50%' && amountPaid > 0 ? amountPaid : total;
  const currencyName = currencyNames[currency] || "Rupees";
  const totalQty = (items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);

  // Calculate tax amounts
  const cgstAmount = Number(tax?.cgstAmount || 0);
  const sgstAmount = Number(tax?.sgstAmount || 0);
  const igstAmount = Number(tax?.igstAmount || 0);
  const taxAmount = Number(tax?.taxAmount || 0);
  const totalTax = cgstAmount + sgstAmount + igstAmount + taxAmount;

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      color: "#000",
      backgroundColor: "#fff",
      padding: "15px",
      width: "210mm",
      minHeight: "297mm",
      margin: "0 auto",
      boxSizing: "border-box",
      fontSize: "11px",
      lineHeight: "1.3",
    }}>
      {/* HEADER - GSTIN and Copy Type */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", paddingBottom: "5px", borderBottom: "1px solid #000" }}>
        <div style={{ fontSize: "10px", fontWeight: "bold" }}>GSTIN : {company.gstin}</div>
        <div style={{ fontSize: "10px", fontWeight: "bold" }}>Original Copy</div>
      </div>

      {/* COMPANY NAME AND DETAILS */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "bold", margin: "0 0 3px 0" }}>DUCO ART PRIVATE LIMITED</h2>
        <p style={{ margin: "1px 0", fontSize: "10px" }}>SADIJA COMPOUND AVANTI VIHAR LIG 64</p>
        <p style={{ margin: "1px 0", fontSize: "10px" }}>NEAR BANK OF BARODA , RAIPUR C.G</p>
        <p style={{ margin: "1px 0", fontSize: "10px" }}>CIN : {company.cin || "U52601CT2020PTC010997"}</p>
        <p style={{ margin: "1px 0", fontSize: "10px" }}>email : {company.email}</p>
      </div>

      {/* INVOICE DETAILS */}
      <div style={{ display: "flex", marginBottom: "8px", borderBottom: "1px solid #000", paddingBottom: "5px" }}>
        <div style={{ flex: 1, paddingRight: "10px", borderRight: "1px solid #000" }}>
          <div style={{ display: "flex", marginBottom: "2px" }}>
            <span style={{ width: "100px" }}>Invoice No.</span>
            <span>: {invoice.number}</span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ width: "100px" }}>Dated</span>
            <span>: {invoice.date}</span>
          </div>
        </div>
        <div style={{ flex: 1, paddingLeft: "10px" }}>
          <div style={{ display: "flex", marginBottom: "2px" }}>
            <span style={{ width: "120px" }}>Place of Supply</span>
            <span>: {invoice.placeOfSupply}</span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ width: "120px" }}>Reverse Charge</span>
            <span>: N</span>
          </div>
        </div>
      </div>

      {/* ✅ PAYMENT CURRENCY AND LOCATION INFO - WITHOUT CONVERSION RATE */}
      {(paymentCurrency !== 'INR' || (customerCountry && customerCountry !== 'India')) && (
        <div style={{ marginBottom: "8px", padding: "6px", backgroundColor: "#f0f0f0", border: "1px solid #999", fontSize: "10px" }}>
          <div style={{ display: "flex", marginBottom: "2px" }}>
            <span style={{ fontWeight: "bold", marginRight: "10px" }}>Payment Currency:</span>
            <span>{paymentCurrency}</span>
          </div>
          {customerCountry && customerCountry !== 'India' && (
            <div style={{ display: "flex" }}>
              <span style={{ fontWeight: "bold", marginRight: "10px" }}>Payment From:</span>
              <span>
                {customerCity && customerState 
                  ? `${customerCity}, ${customerState}, ${customerCountry}` 
                  : customerCountry}
              </span>
            </div>
          )}
        </div>
      )}

      {/* BILLED TO AND SHIPPED TO */}
      <div style={{ display: "flex", marginBottom: "8px", borderBottom: "1px solid #000", paddingBottom: "5px" }}>
        <div style={{ flex: 1, paddingRight: "10px", borderRight: "1px solid #000" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 3px 0" }}>Billed to :</p>
          <p style={{ margin: "1px 0", fontWeight: "bold" }}>{billTo.name}</p>
          <p style={{ margin: "1px 0", fontSize: "10px" }}>{billTo.address}</p>
          {billTo.gstin && (
            <p style={{ margin: "3px 0 0 0", fontSize: "10px" }}>GSTIN / UIN : {billTo.gstin}</p>
          )}
        </div>
        <div style={{ flex: 1, paddingLeft: "10px" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 3px 0" }}>Shipped to :</p>
          <p style={{ margin: "1px 0", fontWeight: "bold" }}>{shipTo?.name || billTo.name}</p>
          <p style={{ margin: "1px 0", fontSize: "10px" }}>{shipTo?.address || billTo.address}</p>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", border: "1px solid #000" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left", width: "25px" }}>S.N.</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "left" }}>Description of Goods</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "center", width: "70px" }}>BARCODE NO.</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "center", width: "50px" }}>HSN</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "center", width: "60px" }}>Qty. Unit</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right", width: "60px" }}>Price</th>
            <th style={{ border: "1px solid #000", padding: "4px", textAlign: "right", width: "70px" }}>Amount ( )</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{i + 1}</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>
                {it.description}
                {it.printSides && it.printSides > 0 ? ` (${it.printSides} sides printing)` : ""}
              </td>
              <td style={{ border: "1px solid #000", padding: "2px", textAlign: "center" }}>
                <BarcodeImage value={it.barcode || "000002"} />
              </td>
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{it.hsn || "4901101"}</td>
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>{it.qty} {it.unit}</td>
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{Number(it.price).toFixed(2)}</td>
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{(it.qty * it.price).toFixed(2)}</td>
            </tr>
          ))}
          {[...Array(Math.max(0, 3 - items.length))].map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: "30px" }}>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000", padding: "4px" }}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* UPLOADED FILES SECTION */}
      {additionalFilesMeta && additionalFilesMeta.length > 0 && (
        <div style={{ marginBottom: "8px", padding: "8px", border: "1px solid #000", backgroundColor: "#f9f9f9" }}>
          <p style={{ margin: "0 0 6px 0", fontSize: "11px", fontWeight: "bold" }}>📎 Uploaded Design Files:</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0" }}>
                <th style={{ border: "1px solid #ccc", padding: "3px", textAlign: "left" }}>File Name</th>
                <th style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center", width: "80px" }}>File Type</th>
                <th style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right", width: "70px" }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {additionalFilesMeta.map((file, idx) => (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: "3px" }}>{file.name || `File ${idx + 1}`}</td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "center" }}>
                    {file.name?.toLowerCase().endsWith('.cdr') ? 'CDR' : file.name?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'File'}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: "3px", textAlign: "right" }}>
                    {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAX SUMMARY */}
      <div style={{ display: "flex", marginBottom: "8px" }}>
        <div style={{ flex: 1 }}></div>
        <div style={{ width: "400px", borderLeft: "1px solid #000" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {/* ✅ SUBTOTAL */}
              <tr>
                <td style={{ padding: "3px 8px", textAlign: "left" }}>Subtotal</td>
                <td style={{ padding: "3px 8px", textAlign: "right" }}>-</td>
                <td style={{ padding: "3px 8px", textAlign: "right" }}>{subtotal.toFixed(2)}</td>
              </tr>
              
              {/* ✅ P&F CHARGES (Show if > 0) */}
              {charges?.pf > 0 && (
                <tr>
                  <td style={{ padding: "3px 8px", textAlign: "left" }}>P&F Charges</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>-</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{Number(charges.pf).toFixed(2)}</td>
                </tr>
              )}
              
              {/* ✅ PRINTING CHARGES (Show if > 0) */}
              {charges?.printing > 0 && (
                <tr>
                  <td style={{ padding: "3px 8px", textAlign: "left" }}>Printing Charges</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>-</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{Number(charges.printing).toFixed(2)}</td>
                </tr>
              )}
              
              {/* ✅ INTRASTATE_CGST_SGST: 2.5% CGST + 2.5% SGST (Chhattisgarh - Home State) */}
              {(tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') && (
                <>
                  <tr>
                    <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : SGST</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.sgstRate || 2.5).toFixed(2)} %</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>{sgstAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : CGST</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.cgstRate || 2.5).toFixed(2)} %</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>{cgstAmount.toFixed(2)}</td>
                  </tr>
                </>
              )}
              
              {/* INTERSTATE: 5% IGST only (Outside Chhattisgarh) */}
              {(tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') && (
                <tr>
                  <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : IGST</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.igstRate || 5).toFixed(2)} %</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{igstAmount.toFixed(2)}</td>
                </tr>
              )}
              
              {/* INTERNATIONAL: 1% TAX */}
              {(tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') && (
                <tr>
                  <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : TAX</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.taxRate || 1).toFixed(2)} %</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>{taxAmount.toFixed(2)}</td>
                </tr>
              )}
              
              {/* B2C_NO_TAX: No tax */}
              {tax?.type === 'B2C_NO_TAX' && (
                <tr>
                  <td style={{ padding: "3px 8px", textAlign: "left" }}>Tax</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>@ 0.00 %</td>
                  <td style={{ padding: "3px 8px", textAlign: "right" }}>0.00</td>
                </tr>
              )}
              
              {/* Fallback for old invoices without type */}
              {!tax?.type && cgstAmount > 0 && (
                <>
                  <tr>
                    <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : SGST</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.sgstRate || 2.5).toFixed(2)} %</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>{sgstAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "3px 8px", textAlign: "left" }}>Add : CGST</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>@ {(tax?.cgstRate || 2.5).toFixed(2)} %</td>
                    <td style={{ padding: "3px 8px", textAlign: "right" }}>{cgstAmount.toFixed(2)}</td>
                  </tr>
                </>
              )}
              
              <tr style={{ borderTop: "2px solid #000", fontWeight: "bold" }}>
                <td style={{ padding: "4px 8px" }}>Grand Total</td>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>{totalQty.toFixed(2)} Pcs.</td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>-</td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>{displayAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* TAX BREAKDOWN TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", border: "1px solid #000" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5" }}>
            <th style={{ border: "1px solid #000", padding: "4px" }}>Tax Rate</th>
            <th style={{ border: "1px solid #000", padding: "4px" }}>Taxable Amt.</th>
            
            {/* INTRASTATE_CGST_SGST: Show CGST and SGST columns */}
            {(tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') && (
              <>
                <th style={{ border: "1px solid #000", padding: "4px" }}>CGST Amt.</th>
                <th style={{ border: "1px solid #000", padding: "4px" }}>SGST Amt.</th>
              </>
            )}
            
            {/* INTERSTATE: Show IGST column */}
            {(tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') && (
              <th style={{ border: "1px solid #000", padding: "4px" }}>IGST Amt.</th>
            )}
            
            {/* INTERNATIONAL: Show TAX column */}
            {(tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') && (
              <th style={{ border: "1px solid #000", padding: "4px" }}>TAX Amt.</th>
            )}
            
            {/* Fallback for old invoices */}
            {!tax?.type && cgstAmount > 0 && (
              <>
                <th style={{ border: "1px solid #000", padding: "4px" }}>CGST Amt.</th>
                <th style={{ border: "1px solid #000", padding: "4px" }}>SGST Amt.</th>
              </>
            )}
            
            <th style={{ border: "1px solid #000", padding: "4px" }}>Total Tax</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {/* Tax Rate */}
            <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>
              {(tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') && `${((tax?.cgstRate || 0) + (tax?.sgstRate || 0)).toFixed(2)}%`}
              {(tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') && `${(tax?.igstRate || 5).toFixed(2)}%`}
              {(tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') && `${(tax?.taxRate || 1).toFixed(2)}%`}
              {tax?.type === 'B2C_NO_TAX' && `0%`}
              {!tax?.type && cgstAmount > 0 && `${((tax?.cgstRate || 0) + (tax?.sgstRate || 0)).toFixed(2)}%`}
            </td>

            {/* Taxable Amount */}
            <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{subtotal.toFixed(2)}</td>

            {/* INTRASTATE_CGST_SGST: CGST and SGST amounts */}
            {(tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') && (
              <>
                <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{cgstAmount.toFixed(2)}</td>
                <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{sgstAmount.toFixed(2)}</td>
              </>
            )}

            {/* INTERSTATE: IGST amount */}
            {(tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') && (
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{igstAmount.toFixed(2)}</td>
            )}

            {/* INTERNATIONAL: TAX amount */}
            {(tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') && (
              <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{taxAmount.toFixed(2)}</td>
            )}

            {/* Fallback for old invoices */}
            {!tax?.type && cgstAmount > 0 && (
              <>
                <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{cgstAmount.toFixed(2)}</td>
                <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{sgstAmount.toFixed(2)}</td>
              </>
            )}

            {/* Total Tax */}
            <td style={{ border: "1px solid #000", padding: "4px", textAlign: "right" }}>{totalTax.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* AMOUNT IN WORDS */}
      <div style={{ marginBottom: "8px", paddingBottom: "5px", borderBottom: "1px solid #000", fontWeight: "bold" }}>
        {currencyName} {numberToWords(Math.round(displayAmount))} Only
      </div>

      {/* TERMS AND SIGNATURE */}
      <div style={{ display: "flex", minHeight: "100px" }}>
        <div style={{ flex: 1, paddingRight: "10px", borderRight: "1px solid #000" }}>
          <p style={{ fontWeight: "bold", margin: "0 0 5px 0" }}>Terms & Conditions</p>
          <p style={{ margin: "2px 0", fontSize: "10px" }}>E.& O.E.</p>
          {terms && terms.map((t, i) => (
            <p key={i} style={{ margin: "2px 0", fontSize: "10px" }}>{i + 1}. {t}</p>
          ))}
        </div>
        <div style={{ flex: 1, paddingLeft: "10px", textAlign: "center" }}>
          <p style={{ margin: "0 0 40px 0", fontSize: "10px" }}>Receiver's Signature :</p>
          <div style={{ borderTop: "1px solid #000", marginBottom: "20px", height: "40px" }}></div>
          <p style={{ fontWeight: "bold", margin: "0 0 30px 0" }}>For DUCO ART PRIVATE LIMITED</p>
          <p style={{ fontSize: "10px" }}>Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
};
