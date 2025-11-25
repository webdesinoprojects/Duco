import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom"; // ✅ added useLocation
import { getInvoiceByOrder } from "../Service/APIservice";
import { useCart } from "../ContextAPI/CartContext";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JsBarcode from "jsbarcode";

// ✅ INVOICE COMPONENT
const InvoiceDucoTailwind = ({ data }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && data?.invoice?.number) {
      JsBarcode(barcodeRef.current, data.invoice.number, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
      });
    }
  }, [data?.invoice?.number]);

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
  } = data;

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        color: "#000",
        backgroundColor: "#fff",
        padding: "20px 30px",
        width: "800px",
        margin: "0 auto",
        border: "1px solid #ccc",
      }}
    >
      <h1 style={{ textAlign: "center", fontSize: "22px", fontWeight: "bold" }}>
        Tax Invoice
      </h1>

      {/* COMPANY INFO */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "4px" }}>
          {company.name}
        </h2>
        <p>{company.address}</p>
        <p>GSTIN: {company.gstin}</p>
        <p>Email: {company.email}</p>
      </div>

      <svg ref={barcodeRef}></svg>
      <hr style={{ margin: "15px 0" }} />

      {/* INVOICE DETAILS */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p>
            Invoice No: <b>{invoice.number}</b>
          </p>
          <p>Date: {invoice.date}</p>
          <p>Place of Supply: {invoice.placeOfSupply}</p>
        </div>
        <div>
          <p>Copy Type: {invoice.copyType}</p>
        </div>
      </div>

      <hr style={{ margin: "15px 0" }} />

      {/* BILL TO & SHIP TO */}
      {console.log('🚚 Invoice Template - billTo:', billTo)}
      {console.log('📦 Invoice Template - shipTo:', shipTo)}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <h3>Billed to :</h3>
          <p>{billTo?.name}</p>
          <p>{billTo?.address}</p>
          {billTo?.gstin && <p>GSTIN: {billTo.gstin}</p>}
        </div>
        <div style={{ flex: 1 }}>
          <h3>Shipped to :</h3>
          <p>{shipTo?.name || billTo?.name}</p>
          <p>{shipTo?.address || billTo?.address}</p>
        </div>
      </div>

      <hr style={{ margin: "15px 0" }} />

      {/* ITEMS TABLE */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              borderBottom: "2px solid #000",
              background: "#f2f2f2",
            }}
          >
            <th style={{ textAlign: "left", padding: "6px" }}>S.No</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Description</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Qty</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Unit</th>
            <th style={{ textAlign: "left", padding: "6px" }}>Price</th>
            <th style={{ textAlign: "right", padding: "6px" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "6px" }}>{i + 1}</td>
              <td style={{ padding: "6px" }}>{it.description}</td>
              <td style={{ padding: "6px" }}>{it.qty}</td>
              <td style={{ padding: "6px" }}>{it.unit}</td>
              <td style={{ padding: "6px" }}>₹{it.price}</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{(it.qty * it.price).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SUMMARY BOX */}
      <div
        style={{
          marginTop: "25px",
          borderTop: "2px solid #000",
          paddingTop: "10px",
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "300px",
            fontSize: "14px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "6px" }}>Subtotal:</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{subtotal.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>P&F Charges:</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{charges.pf.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>Printing Charges:</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{charges.printing.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>CGST ({tax.cgstRate}%)</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{tax.cgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style={{ padding: "6px" }}>SGST ({tax.sgstRate}%)</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{tax.sgstAmount.toFixed(2)}
              </td>
            </tr>
            <tr
              style={{
                borderTop: "2px solid #000",
                fontWeight: "bold",
                fontSize: "15px",
              }}
            >
              <td style={{ padding: "6px" }}>Grand Total:</td>
              <td style={{ textAlign: "right", padding: "6px" }}>
                ₹{total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr style={{ margin: "20px 0" }} />

      <ul>
        {terms.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>

      <p style={{ marginTop: "30px", fontWeight: "bold", textAlign: "right" }}>
        For {forCompany}
      </p>
    </div>
  );
};

// ✅ MAIN ORDER SUCCESS COMPONENT
export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // ✅ access state
  const [invoiceData, setInvoiceData] = useState(null);
  const { clearCart } = useCart();
  const invoiceRef = useRef();

  // ✅ Read passed data (if available)
  const paymentMethod = location.state?.paymentMethod || "Pay Online (Default)";
  const isB2B =
    location.state?.isB2B !== undefined ? location.state.isB2B : false;

  console.log("💳 Payment Mode:", paymentMethod);
  console.log("🏢 Order Type:", isB2B ? "B2B" : "B2C");

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await getInvoiceByOrder(orderId);
        const inv = res?.invoice;
        if (!inv) throw new Error("No invoice found");

        // ✅ Calculate subtotal dynamically
        const subtotal = inv.items.reduce(
          (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
          0
        );

        const pf = inv.charges?.pf || 0;
        const printing = inv.charges?.printing || 0;

        // ✅ Correct GST split
        const gstRate = inv.tax?.igstRate || 5;
        const gstTotal = (subtotal * gstRate) / 100;
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmount = gstTotal / 2;
        const sgstAmount = gstTotal / 2;
        const total = subtotal + pf + printing + gstTotal;

        const formatted = {
          ...inv,
          tax: { cgstRate, sgstRate, cgstAmount, sgstAmount },
          subtotal,
          total,
        };

        setInvoiceData(formatted);
        clearCart();
      } catch (err) {
        console.error("Error fetching invoice:", err);
        navigate("/");
      }
    }
    fetchInvoice();
  }, [orderId, clearCart, navigate]);

  // ✅ PDF DOWNLOAD
  const downloadPDF = async () => {
    const input = invoiceRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(
      pageWidth / canvas.width,
      pageHeight / canvas.height
    );
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

  // ✅ Render Invoice
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
