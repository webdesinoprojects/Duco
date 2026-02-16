const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Invoice PDF Service
 * Generates PDF invoices using Puppeteer
 */

class InvoicePDFService {
  constructor() {
    this.outputDir = path.join(__dirname, '../invoices');
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch (error) {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate HTML template for invoice
   */
  generateInvoiceHTML(data) {
    const {
      company = {},
      invoice = {},
      billTo = {},
      shipTo = {},
      items = [],
      charges = {},
      tax = {},
      subtotal = 0,
      total = 0,
      terms = '',
      discount = null,
      currencySymbol = '₹',
      currency = 'INR',
      paymentmode = 'online',
      amountPaid = 0,
    } = data;

    const formatCurrency = (amount) =>
      `${currencySymbol}${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const numberToWords = (num) => {
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
    };

    const totalTax =
      Number(tax?.cgstAmount || 0) +
      Number(tax?.sgstAmount || 0) +
      Number(tax?.igstAmount || 0) +
      Number(tax?.taxAmount || 0);

    const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);
    
    // ✅ Calculate discount and taxable values
    const discountAmount = Number(discount?.amount || 0);
    const discountPercent = Number(discount?.discountPercentage || discount?.percent || 0);
    const subtotalAfterDiscount = subtotal - discountAmount;
    const taxableAmount = subtotalAfterDiscount + Number(charges?.pf || 0) + Number(charges?.printing || 0);
    
    const totalInWords = `${numberToWords(Math.round(total))} Only`;

    const rows = items.map((it, i) => {
      const description = it.description || it.name || '';
      const barcode = it.barcode || '000002';
      const hsn = it.hsn || '4901101';
      const qty = it.qty || 0;
      const unit = it.unit || 'Pcs.';
      const price = Number(it.price || 0).toFixed(2);
      const amount = (Number(it.price || 0) * Number(it.qty || 0)).toFixed(2);

      return `
        <tr>
          <td class="cell center">${i + 1}</td>
          <td class="cell">${description}</td>
          <td class="cell center"><svg class="barcode" id="barcode-${i}" data-barcode="${barcode}"></svg></td>
          <td class="cell center">${hsn}</td>
          <td class="cell center">${qty} ${unit}</td>
          <td class="cell right">${price}</td>
          <td class="cell right">${amount}</td>
        </tr>
      `;
    }).join('');

    const emptyRows = Array.from({ length: Math.max(0, 3 - items.length) }).map(() => `
      <tr class="empty-row">
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
        <td class="cell">&nbsp;</td>
      </tr>
    `).join('');

    const taxRows = (() => {
      if (tax?.type === 'B2C_NO_TAX') return '';
      if (tax?.type === 'INTERNATIONAL') {
        return `
          <tr>
            <td colspan="5" class="right">Add : TAX @ ${tax?.taxRate || 0}%</td>
            <td class="right">${formatCurrency(tax?.taxAmount || 0)}</td>
          </tr>
        `;
      }
      if (tax?.type === 'INTRASTATE_IGST') {
        return `
          <tr>
            <td colspan="5" class="right">Add : IGST @ ${tax?.igstRate || 0}%</td>
            <td class="right">${formatCurrency(tax?.igstAmount || 0)}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td colspan="5" class="right">Add : CGST @ ${tax?.cgstRate || 0}%</td>
          <td class="right">${formatCurrency(tax?.cgstAmount || 0)}</td>
        </tr>
        <tr>
          <td colspan="5" class="right">Add : SGST @ ${tax?.sgstRate || 0}%</td>
          <td class="right">${formatCurrency(tax?.sgstAmount || 0)}</td>
        </tr>
      `;
    })();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #000; margin: 0; padding: 16px; }
          .line { border-bottom: 1px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
          .header-top { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; }
          .title { text-align: center; margin-bottom: 6px; }
          .title h2 { margin: 0; font-size: 16px; }
          .title p { margin: 2px 0; font-size: 10px; }
          .row { display: flex; }
          .col { flex: 1; padding: 6px; }
          .border-right { border-right: 1px solid #000; }
          .table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .table th, .table td { border: 1px solid #000; padding: 4px; }
          .table th { background: #f5f5f5; }
          .center { text-align: center; }
          .right { text-align: right; }
          .barcode { width: 90px; height: 22px; }
          .empty-row td { height: 28px; }
          .totals { width: 100%; border: 1px solid #000; border-top: none; font-size: 11px; }
          .totals td { padding: 6px; }
          .footer { border-top: 1px solid #000; margin-top: 6px; padding-top: 6px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header-top line">
          <div>GSTIN : ${company.gstin || 'N/A'}</div>
          <div>Original Copy</div>
        </div>

        <div class="title line">
          <h2>DUCO ART PRIVATE LIMITED</h2>
          <p>SADIJA COMPOUND AVANTI VIHAR LIG 64</p>
          <p>NEAR BANK OF BARODA , RAIPUR C.G</p>
          <p>CIN : ${company.cin || 'U52601CT2020PTC010997'}</p>
          <p>email : ${company.email || 'Duco@ducoart.com'}</p>
        </div>

        <div class="row line">
          <div class="col border-right">
            <div>Invoice No. : ${invoice.number || 'N/A'}</div>
            <div>Dated : ${invoice.date || ''}</div>
          </div>
          <div class="col">
            <div>Place of Supply : ${invoice.placeOfSupply || ''}</div>
            <div>Reverse Charge : N</div>
          </div>
        </div>

        <div class="row line">
          <div class="col border-right">
            <div><strong>Billed to :</strong></div>
            <div><strong>${billTo.name || ''}</strong></div>
            <div>${billTo.address || ''}</div>
            ${billTo.gstin ? `<div>GSTIN / UIN : ${billTo.gstin}</div>` : ''}
          </div>
          <div class="col">
            <div><strong>Shipped to :</strong></div>
            <div><strong>${shipTo?.name || billTo.name || ''}</strong></div>
            <div>${shipTo?.address || billTo.address || ''}</div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 30px;">S.N.</th>
              <th>Description of Goods</th>
              <th style="width: 90px;">BARCODE NO.</th>
              <th style="width: 50px;">HSN</th>
              <th style="width: 70px;">Qty. Unit</th>
              <th style="width: 70px;">Price</th>
              <th style="width: 90px;">Amount ( )</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            ${emptyRows}
          </tbody>
        </table>

        <table class="totals">
          <tr>
            <td colspan="5" class="right">Subtotal</td>
            <td class="right">${formatCurrency(subtotal)}</td>
          </tr>
          ${
            discountAmount > 0
              ? `<tr style="background-color: #ffebee;">
                  <td colspan="5" class="right" style="font-weight: bold; color: #d32f2f;">Less: Discount (Corporate - ${discountPercent.toFixed(2)}%)</td>
                  <td class="right" style="font-weight: bold; color: #d32f2f;">-${formatCurrency(discountAmount)}</td>
                </tr>
                <tr style="background-color: #f5f5f5;">
                  <td colspan="5" class="right" style="font-weight: bold; text-decoration: underline;">Subtotal After Discount</td>
                  <td class="right" style="font-weight: bold;">${formatCurrency(subtotalAfterDiscount)}</td>
                </tr>`
              : ''
          }
          <tr>
            <td colspan="5" class="right">P&F Charges</td>
            <td class="right">${formatCurrency(charges.pf || 0)}</td>
          </tr>
          ${
            charges?.printing > 0
              ? `<tr>
                  <td colspan="5" class="right">Printing Charges</td>
                  <td class="right">${formatCurrency(charges.printing || 0)}</td>
                </tr>`
              : ''
          }
          <tr style="background-color: #f9f9f9; font-style: italic;">
            <td colspan="5" class="right" style="font-size: 11px;">Taxable Amount</td>
            <td class="right" style="font-size: 11px;">${formatCurrency(taxableAmount)}</td>
          </tr>
          ${taxRows}
          <tr>
            <td colspan="4" class="right"><strong>Grand Total</strong></td>
            <td class="center"><strong>${totalQty} Pcs.</strong></td>
            <td class="right"><strong>${formatCurrency(total)}</strong></td>
          </tr>
          <tr>
            <td colspan="5" class="right">Paid Amount</td>
            <td class="right">${formatCurrency(amountPaid || total)}</td>
          </tr>
          <tr>
            <td colspan="6" style="padding-top: 8px;">Rupees ${totalInWords}</td>
          </tr>
        </table>

        <div class="footer">
          ${terms ? `<div><strong>Terms & Conditions:</strong> ${terms}</div>` : ''}
        </div>

        <script>
          try {
            document.querySelectorAll('svg.barcode').forEach((el) => {
              const value = el.getAttribute('data-barcode') || '000002';
              JsBarcode(el, value, { format: 'CODE128', width: 1, height: 25, displayValue: false, margin: 0 });
            });
          } catch (err) {
            console.warn('Barcode render error', err);
          }
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Generate PDF from invoice data
   * @param {Object} invoiceData - Invoice data
   * @param {String} orderId - Order ID
   * @returns {String} - Path to generated PDF
   */
  async generatePDF(invoiceData, orderId) {
    try {
      await this.ensureOutputDir();

      const html = this.generateInvoiceHTML(invoiceData);
      const safeOrderId = String(orderId || 'order')
        .replace(/[\\/]/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `invoice-${safeOrderId}-${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate PDF with proper margins to prevent content cutoff
      const pdfBuffer = await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        preferCSSPageSize: true,
      });

      await browser.close();

      console.log(`✅ PDF generated: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      throw error;
    }
  }
}

module.exports = new InvoicePDFService();
