import React, { useRef } from "react";
import { InvoiceTemplate } from "../../Components/InvoiceTemplate";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * AdminInvoiceViewer Component
 * ============================
 * Standardized invoice viewer for all admin panels (OderSection, OrderBulk, AnalyticsDashboard)
 * Uses the main InvoiceTemplate component from OrderSuccess
 * 
 * Props:
 * - invoiceData: Invoice data object
 * - onClose: Callback when modal closes
 * - showModal: Boolean to show/hide modal
 */

const AdminInvoiceViewer = ({ invoiceData, onClose, showModal }) => {
  const invoiceRef = useRef();

  if (!showModal || !invoiceData) return null;

  const downloadInvoicePDF = async () => {
    const input = invoiceRef.current;
    if (!input) return;
    
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`invoice-${invoiceData?.invoice?.number || 'document'}.pdf`);
    } catch (error) {
      console.error("Failed to download invoice:", error);
    }
  };

  const printInvoice = () => {
    const input = invoiceRef.current;
    if (!input) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(input.innerHTML);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">Invoice #{invoiceData?.invoice?.number}</h2>
          <div className="flex gap-2">
            <button
              onClick={printInvoice}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 00-2-2h-2m-4-4V9m0 4v6m0-6a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
              Print
            </button>
            <button
              onClick={downloadInvoicePDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-4 bg-gray-50">
          <div ref={invoiceRef} className="bg-white">
            <InvoiceTemplate data={invoiceData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoiceViewer;
