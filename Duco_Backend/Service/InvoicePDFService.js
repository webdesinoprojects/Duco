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
      currencySymbol = '₹',
      currency = 'INR',
      paymentmode = 'online',
      amountPaid = 0,
      paymentCurrency = 'INR',
      customerCountry = 'India',
      customerCity = '',
      customerState = '',
    } = data;

    const formatCurrency = (amount) => {
      return `${currencySymbol}${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    };

    const itemsHTML = items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.name || ''}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.qty || 0}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(item.price || 0)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency((item.price || 0) * (item.qty || 0))}</td>
      </tr>
    `).join('');

    const chargesHTML = Object.entries(charges || {})
      .filter(([key, value]) => value > 0)
      .map(([key, value]) => `
        <tr>
          <td colspan="4" style="padding: 8px; text-align: right; text-transform: capitalize;">${key} Charges:</td>
          <td style="padding: 8px; text-align: right;">${formatCurrency(value)}</td>
        </tr>
      `).join('');

    const taxHTML = (() => {
      if (tax.type === 'INTERNATIONAL') {
        return `
          <tr>
            <td colspan="4" style="padding: 8px; text-align: right;">TAX (${tax.taxRate || 0}%):</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency((subtotal * (tax.taxRate || 0)) / 100)}</td>
          </tr>
        `;
      } else if (tax.type === 'INTRASTATE_IGST') {
        return `
          <tr>
            <td colspan="4" style="padding: 8px; text-align: right;">IGST (${tax.igstRate || 0}%):</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency((subtotal * (tax.igstRate || 0)) / 100)}</td>
          </tr>
        `;
      } else if (tax.type === 'B2C_NO_TAX') {
        return '';
      } else {
        return `
          <tr>
            <td colspan="4" style="padding: 8px; text-align: right;">CGST (${tax.cgstRate || 0}%):</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency((subtotal * (tax.cgstRate || 0)) / 100)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 8px; text-align: right;">SGST (${tax.sgstRate || 0}%):</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency((subtotal * (tax.sgstRate || 0)) / 100)}</td>
          </tr>
        `;
      }
    })();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; }
          .invoice { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; }
          .company-name { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
          .invoice-title { font-size: 20px; opacity: 0.9; }
          .info-section { padding: 20px 30px; display: flex; justify-content: space-between; background: #f9f9f9; }
          .info-block { flex: 1; }
          .info-block h3 { font-size: 14px; color: #666; margin-bottom: 10px; text-transform: uppercase; }
          .info-block p { margin: 5px 0; font-size: 14px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th { background: #f0f0f0; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
          .totals { background: #f9f9f9; padding: 20px 30px; }
          .totals table { width: 100%; }
          .totals tr.grand-total { font-weight: bold; font-size: 18px; border-top: 2px solid #667eea; }
          .totals tr.grand-total td { padding-top: 15px; }
          .footer { padding: 20px 30px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .terms { margin-top: 20px; padding: 15px; background: #fffbf0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${company.name || 'Duco'}</div>
            <div class="invoice-title">INVOICE #${invoice.invoiceNumber || 'N/A'}</div>
          </div>

          <!-- Info Section -->
          <div class="info-section">
            <div class="info-block">
              <h3>From:</h3>
              <p><strong>${company.name || ''}</strong></p>
              <p>${company.address || ''}</p>
              <p>${company.city || ''}, ${company.state || ''} ${company.pincode || ''}</p>
              <p>GST: ${company.gst || 'N/A'}</p>
            </div>
            <div class="info-block">
              <h3>Bill To:</h3>
              <p><strong>${billTo.name || ''}</strong></p>
              <p>${billTo.address || ''}</p>
              <p>${billTo.city || ''}, ${billTo.state || ''} ${billTo.pincode || ''}</p>
              <p>Phone: ${billTo.phone || ''}</p>
              ${billTo.gst ? `<p>GST: ${billTo.gst}</p>` : ''}
            </div>
            <div class="info-block">
              <h3>Ship To:</h3>
              <p><strong>${shipTo.name || ''}</strong></p>
              <p>${shipTo.address || ''}</p>
              <p>${shipTo.city || ''}, ${shipTo.state || ''} ${shipTo.pincode || ''}</p>
              <p>Phone: ${shipTo.phone || ''}</p>
            </div>
          </div>

          <!-- Items Table -->
          <div style="padding: 0 30px;">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px;">#</th>
                  <th>Description</th>
                  <th style="width: 100px; text-align: center;">Quantity</th>
                  <th style="width: 120px; text-align: right;">Rate</th>
                  <th style="width: 120px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div class="totals">
            <table>
              <tr>
                <td colspan="4" style="padding: 8px; text-align: right;">Subtotal:</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(subtotal)}</td>
              </tr>
              ${chargesHTML}
              ${taxHTML}
              <tr class="grand-total">
                <td colspan="4" style="padding: 8px; text-align: right;">TOTAL:</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(total)}</td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 8px; text-align: right;">Payment Mode:</td>
                <td style="padding: 8px; text-align: right; text-transform: capitalize;">${paymentmode}</td>
              </tr>
              <tr>
                <td colspan="4" style="padding: 8px; text-align: right;">Amount Paid:</td>
                <td style="padding: 8px; text-align: right;">${formatCurrency(amountPaid)}</td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            ${terms ? `
              <div class="terms">
                <strong>Terms & Conditions:</strong><br>
                ${terms}
              </div>
            ` : ''}
            <p style="margin-top: 20px; text-align: center;">Thank you for your business!</p>
          </div>
        </div>
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
      const fileName = `invoice-${orderId}-${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Launch browser
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
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
