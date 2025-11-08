import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

const LabelGenerator = ({ order, onClose }) => {
  const labelRef = useRef(null);
  const barcodeRef = useRef(null);

  // Generate barcode when component mounts
  React.useEffect(() => {
    if (barcodeRef.current && order?.orderId) {
      try {
        JsBarcode(barcodeRef.current, order.orderId, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 5
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [order?.orderId]);

  const downloadAsPDF = async () => {
    const element = labelRef.current;
    if (!element) {
      console.error('Label element not found');
      alert('Label element not found. Please try again.');
      return;
    }

    try {
      console.log('📄 Generating PDF...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      console.log('✅ Canvas created, converting to PDF...');
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      pdf.save(`shipping-label-${order.orderId || order._id}.pdf`);
      console.log('✅ PDF downloaded successfully');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  const downloadAsImage = async () => {
    const element = labelRef.current;
    if (!element) {
      console.error('Label element not found');
      alert('Label element not found. Please try again.');
      return;
    }

    try {
      console.log('🖼️ Generating image...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      console.log('✅ Canvas created, downloading image...');
      const link = document.createElement('a');
      link.download = `shipping-label-${order.orderId || order._id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      console.log('✅ Image downloaded successfully');
    } catch (error) {
      console.error('❌ Error generating image:', error);
      alert(`Failed to generate image: ${error.message}`);
    }
  };

  const printLabel = () => {
    const element = labelRef.current;
    if (!element) {
      console.error('Label element not found');
      alert('Label element not found. Please try again.');
      return;
    }

    try {
      console.log('🖨️ Opening print dialog...');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print labels');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label - ${order.orderId || order._id}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
              @media print {
                body { margin: 0; padding: 0; }
                @page { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${element.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      console.log('✅ Print dialog opened');
    } catch (error) {
      console.error('❌ Error printing label:', error);
      alert(`Failed to print label: ${error.message}`);
    }
  };

  if (!order) return null;

  const totalItems = order.products?.reduce((sum, product) => {
    const qty = Object.values(product.quantity || {}).reduce((s, n) => s + Number(n || 0), 0);
    return sum + qty;
  }, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Generate Shipping Label</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 border-b flex flex-wrap gap-3">
          <button
            onClick={downloadAsPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
          >
            📄 Download PDF
          </button>
          <button
            onClick={downloadAsImage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            🖼️ Download Image
          </button>
          <button
            onClick={printLabel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            🖨️ Print Label
          </button>
        </div>

        {/* Label Preview */}
        <div className="p-6">
          <div
            ref={labelRef}
            className="bg-white border-2 border-gray-300 p-8"
            style={{ width: '794px', maxWidth: '100%', margin: '0 auto' }}
          >
            {/* Header Section */}
            <div className="border-b-2 border-black pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold">DUCO ART</h1>
                  <p className="text-sm text-gray-600">Custom T-Shirt Printing</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Order Date</p>
                  <p className="font-semibold">
                    {new Date(order.createdAt).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Order ID and Barcode */}
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Order ID</p>
              <p className="text-2xl font-bold mb-3">{order.orderId || order._id}</p>
              <svg ref={barcodeRef}></svg>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Ship From */}
              <div className="border border-gray-300 p-4">
                <h3 className="font-bold text-sm mb-2 bg-gray-100 px-2 py-1">SHIP FROM</h3>
                <p className="font-semibold">DUCO ART PRIVATE LIMITED</p>
                <p className="text-sm">123 Teen Murti Marg</p>
                <p className="text-sm">New Delhi, India</p>
                <p className="text-sm">GSTIN: 22AAICD1719N1ZM</p>
                <p className="text-sm mt-2">📞 +91-XXXXXXXXXX</p>
                <p className="text-sm">📧 support@ducoart.com</p>
              </div>

              {/* Ship To */}
              <div className="border-2 border-black p-4">
                <h3 className="font-bold text-sm mb-2 bg-black text-white px-2 py-1">SHIP TO</h3>
                <p className="font-bold text-lg">{order.address?.fullName || 'N/A'}</p>
                <p className="text-sm">{order.address?.houseNumber}, {order.address?.street}</p>
                {order.address?.landmark && (
                  <p className="text-sm">Near: {order.address.landmark}</p>
                )}
                <p className="text-sm">{order.address?.city}, {order.address?.state}</p>
                <p className="text-sm font-semibold">PIN: {order.address?.pincode}</p>
                <p className="text-sm">{order.address?.country || 'India'}</p>
                <p className="text-sm mt-2">📞 {order.address?.mobileNumber || 'N/A'}</p>
                <p className="text-sm">📧 {order.address?.email || 'N/A'}</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border border-gray-300 mb-6">
              <h3 className="font-bold text-sm bg-gray-100 px-4 py-2 border-b">ORDER SUMMARY</h3>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Color</th>
                      <th className="text-left py-2">Sizes</th>
                      <th className="text-right py-2">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.products?.map((product, index) => {
                      const qty = Object.values(product.quantity || {}).reduce(
                        (s, n) => s + Number(n || 0),
                        0
                      );
                      const sizes = Object.entries(product.quantity || {})
                        .filter(([_, count]) => count > 0)
                        .map(([size, count]) => `${size}×${count}`)
                        .join(', ');

                      return (
                        <tr key={index} className="border-b">
                          <td className="py-2">{product.name || product.products_name || 'Product'}</td>
                          <td className="py-2">{product.color || '-'}</td>
                          <td className="py-2 text-xs">{sizes || '-'}</td>
                          <td className="py-2 text-right font-semibold">{qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan="3" className="py-2 text-right">Total Items:</td>
                      <td className="py-2 text-right">{totalItems}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment and Shipping Info */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="border border-gray-300 p-3">
                <p className="font-semibold mb-1">Payment Status</p>
                <p className={`inline-block px-2 py-1 rounded text-xs ${
                  order.paymentStatus === 'Paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.paymentStatus || 'Pending'}
                </p>
              </div>
              <div className="border border-gray-300 p-3">
                <p className="font-semibold mb-1">Payment Mode</p>
                <p>{order.paymentmode || 'N/A'}</p>
              </div>
              <div className="border border-gray-300 p-3">
                <p className="font-semibold mb-1">Order Type</p>
                <p>{order.orderType === 'B2B' ? 'Corporate (B2B)' : 'Retail (B2C)'}</p>
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="border border-yellow-400 bg-yellow-50 p-3 mb-6">
                <p className="font-semibold text-sm mb-1">⚠️ Special Instructions:</p>
                <p className="text-sm">{order.specialInstructions}</p>
              </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-gray-300 pt-4 mt-6">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <div>
                  <p>Generated: {new Date().toLocaleString('en-IN')}</p>
                  <p>Status: {order.status}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Handle with Care</p>
                  <p>This side up ↑</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelGenerator;