const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Invoice PDF Service
 * Generates PDF invoices using Puppeteer
 * 
 * ✅ UNIFIED: This service now generates HTML that exactly matches
 * the React InvoiceTemplate.jsx component used on the frontend
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
   * Number to words converter (matches React component)
   */
  numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + this.numberToWords(num % 100) : '');
    if (num < 100000) return this.numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + this.numberToWords(num % 1000) : '');
    if (num < 10000000) return this.numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + this.numberToWords(num % 100000) : '');
    return this.numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + this.numberToWords(num % 10000000) : '');
  }

  /**
   * Generate HTML template for invoice (EXACTLY matching React InvoiceTemplate.jsx).
   * SNAPSHOT RULE: No arithmetic. All numeric values are passed in from the saved invoice/totals.
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
      discountAmount = 0,
      discountPercent = 0,
      discountedSubtotal = subtotal,
      taxableValue = subtotal,
      totalTaxAmt = 0,
      totalQty = 0,
      terms = [],
      forCompany = 'DUCO ART PRIVATE LIMITED',
      currencySymbol = '₹',
      currency = 'INR',
      paymentmode = 'online',
      amountPaid = 0,
      additionalFilesMeta = [],
      paymentCurrency = 'INR',
      customerCountry = 'India',
      customerCity = '',
      customerState = '',
      discount = null,
    } = data;

    // ✅ SNAPSHOT: Use only passed-in saved values. No recalculation.
    const displaySubtotal = Number(subtotal);
    const displayDiscountAmount = Number(discountAmount);
    const displayDiscountPercent = Number(discountPercent);
    const displayDiscountedSubtotal = Number(discountedSubtotal);
    const displayTaxableValue = Number(taxableValue);
    const displayGrandTotal = Number(total);
    const displayTotalTax = Number(totalTaxAmt);
    const displayCgstAmount = Number(tax?.cgstAmount ?? 0);
    const displaySgstAmount = Number(tax?.sgstAmount ?? 0);
    const displayIgstAmount = Number(tax?.igstAmount ?? 0);
    const displayTaxAmount = Number(tax?.taxAmount ?? 0);
    const displayAmountPaid = Number(amountPaid ?? 0);
    const displayLeftAmount = Math.max(0, displayGrandTotal - displayAmountPaid);
    const displayTotalQty = Number(totalQty) || (items || []).reduce((sum, it) => sum + Number(it.qty || 0), 0);

    const hasPartialPayment = paymentmode === '50%' && displayAmountPaid > 0 && displayAmountPaid < displayGrandTotal;
    const showPaidAmount = displayAmountPaid > 0 || (discount && Number(discount?.amount ?? 0) > 0);

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
    const currencyName = currencyNames[currency] || "Rupees";

    const isB2C = tax?.type === 'B2C_NO_TAX';

    // Generate items rows
    const itemsRows = items.map((it, i) => {
      const description = it.description || '';
      const printSides = it.printSides || 0;
      const barcode = it.barcode || '000002';
      const hsn = it.hsn || '4901101';
      const qty = Number(it.qty || 0);
      const unit = it.unit || 'Pcs.';
      const price = Number(it.price || 0);

      return `
        <tr>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
          <td style="border: 1px solid #000; padding: 4px;">
            ${description}${printSides > 0 ? ` (${printSides} sides printing)` : ''}
          </td>
          <td style="border: 1px solid #000; padding: 2px; text-align: center;">
            <canvas class="barcode-canvas" data-barcode="${barcode}" style="max-width: 100%; height: 25px;"></canvas>
          </td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${hsn}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: center;">${qty} ${unit}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${price.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${(qty * price).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    // Generate empty rows (minimum 3 rows)
    const emptyRows = Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => `
      <tr style="height: 30px;">
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
        <td style="border: 1px solid #000; padding: 4px;">&nbsp;</td>
      </tr>
    `).join('');

    // Generate additional files section
    const additionalFilesSection = additionalFilesMeta && additionalFilesMeta.length > 0 ? `
      <div style="margin-bottom: 8px; padding: 8px; border: 1px solid #000; background-color: #f9f9f9;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: bold;">📎 Uploaded Design Files:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th style="border: 1px solid #ccc; padding: 3px; text-align: left;">File Name</th>
              <th style="border: 1px solid #ccc; padding: 3px; text-align: center; width: 80px;">File Type</th>
              <th style="border: 1px solid #ccc; padding: 3px; text-align: right; width: 70px;">Size</th>
            </tr>
          </thead>
          <tbody>
            ${additionalFilesMeta.map((file, idx) => {
              const fileName = file.name || `File ${idx + 1}`;
              const fileType = fileName.toLowerCase().endsWith('.cdr') ? 'CDR' : fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'File';
              const fileSize = file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A';
              return `
                <tr>
                  <td style="border: 1px solid #ccc; padding: 3px;">${fileName}</td>
                  <td style="border: 1px solid #ccc; padding: 3px; text-align: center;">${fileType}</td>
                  <td style="border: 1px solid #ccc; padding: 3px; text-align: right;">${fileSize}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    // Tax rows: bind saved tax amounts only (no formulas)
    const getTaxRows = () => {
      if (isB2C) {
        return '<tr><td style="padding: 3px 8px; text-align: left; font-style: italic;" colSpan="3">Including taxes</td></tr>';
      }

      let rows = '';
      if (tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') {
        rows += `
          <tr>
            <td style="padding: 3px 8px; text-align: left;">Add : SGST</td>
            <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.sgstRate ?? 2.5).toFixed(2)} %</td>
            <td style="padding: 3px 8px; text-align: right;">${displaySgstAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 8px; text-align: left;">Add : CGST</td>
            <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.cgstRate ?? 2.5).toFixed(2)} %</td>
            <td style="padding: 3px 8px; text-align: right;">${displayCgstAmount.toFixed(2)}</td>
          </tr>
        `;
      } else if (tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') {
        rows += `
          <tr>
            <td style="padding: 3px 8px; text-align: left;">Add : IGST</td>
            <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.igstRate ?? 5).toFixed(2)} %</td>
            <td style="padding: 3px 8px; text-align: right;">${displayIgstAmount.toFixed(2)}</td>
          </tr>
        `;
      } else if (tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') {
        if (displayTaxAmount > 0) {
          rows += `
            <tr>
              <td style="padding: 3px 8px; text-align: left;">Add : Service Charge</td>
              <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.taxRate ?? 1).toFixed(2)} %</td>
              <td style="padding: 3px 8px; text-align: right;">${displayTaxAmount.toFixed(2)}</td>
            </tr>
          `;
        }
      } else if (!tax?.type && displayCgstAmount > 0) {
        rows += `
          <tr>
            <td style="padding: 3px 8px; text-align: left;">Add : SGST</td>
            <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.sgstRate ?? 2.5).toFixed(2)} %</td>
            <td style="padding: 3px 8px; text-align: right;">${displaySgstAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 8px; text-align: left;">Add : CGST</td>
            <td style="padding: 3px 8px; text-align: right;">@ ${(tax?.cgstRate ?? 2.5).toFixed(2)} %</td>
            <td style="padding: 3px 8px; text-align: right;">${displayCgstAmount.toFixed(2)}</td>
          </tr>
        `;
      }
      return rows;
    };

    // Tax breakdown table: bind saved values only
    const getTaxBreakdownTable = () => {
      if (isB2C) return '';

      let taxRateDisplay = '';
      let taxColumns = '';
      let taxValues = '';

      if (tax?.type === 'INTRASTATE_CGST_SGST' || tax?.type === 'HOME_STATE_GST') {
        taxRateDisplay = `${((tax?.cgstRate ?? 0) + (tax?.sgstRate ?? 0)).toFixed(2)}%`;
        taxColumns = `
          <th style="border: 1px solid #000; padding: 4px;">CGST Amt.</th>
          <th style="border: 1px solid #000; padding: 4px;">SGST Amt.</th>
        `;
        taxValues = `
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayCgstAmount.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displaySgstAmount.toFixed(2)}</td>
        `;
      } else if (tax?.type === 'INTERSTATE' || tax?.type === 'OUTSIDE_STATE_IGST') {
        taxRateDisplay = `${(tax?.igstRate ?? 5).toFixed(2)}%`;
        taxColumns = '<th style="border: 1px solid #000; padding: 4px;">IGST Amt.</th>';
        taxValues = `<td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayIgstAmount.toFixed(2)}</td>`;
      } else if (tax?.type === 'INTERNATIONAL' || tax?.type === 'INTERNATIONAL_TAX') {
        taxRateDisplay = `${(tax?.taxRate ?? 1).toFixed(2)}%`;
        taxColumns = '<th style="border: 1px solid #000; padding: 4px;">TAX Amt.</th>';
        taxValues = `<td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayTaxAmount.toFixed(2)}</td>`;
      } else if (!tax?.type && displayCgstAmount > 0) {
        taxRateDisplay = `${((tax?.cgstRate ?? 0) + (tax?.sgstRate ?? 0)).toFixed(2)}%`;
        taxColumns = `
          <th style="border: 1px solid #000; padding: 4px;">CGST Amt.</th>
          <th style="border: 1px solid #000; padding: 4px;">SGST Amt.</th>
        `;
        taxValues = `
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayCgstAmount.toFixed(2)}</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displaySgstAmount.toFixed(2)}</td>
        `;
      }

      if (!taxRateDisplay) return '';

      return `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 4px;">Tax Rate</th>
              <th style="border: 1px solid #000; padding: 4px;">Taxable Amt.</th>
              ${taxColumns}
              <th style="border: 1px solid #000; padding: 4px;">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; text-align: center;">${taxRateDisplay}</td>
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayTaxableValue.toFixed(2)}</td>
              ${taxValues}
              <td style="border: 1px solid #000; padding: 4px; text-align: right;">${displayTotalTax.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      `;
    };

    // Payment currency section
    const paymentCurrencySection = (paymentCurrency !== 'INR' || (customerCountry && customerCountry !== 'India')) ? `
      <div style="margin-bottom: 8px; padding: 6px; background-color: #f0f0f0; border: 1px solid #999; font-size: 10px;">
        <div style="display: flex; margin-bottom: 2px;">
          <span style="font-weight: bold; margin-right: 10px;">Payment Currency:</span>
          <span>${paymentCurrency}</span>
        </div>
        ${customerCountry && customerCountry !== 'India' ? `
          <div style="display: flex;">
            <span style="font-weight: bold; margin-right: 10px;">Payment From:</span>
            <span>${customerCity && customerState ? `${customerCity}, ${customerState}, ${customerCountry}` : customerCountry}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    // Terms section
    const termsSection = terms && terms.length > 0 ? terms.map((t, i) => `
      <p style="margin: 2px 0; font-size: 10px;">${i + 1}. ${t}</p>
    `).join('') : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            color: #000; 
            background-color: #fff; 
            padding: 15px; 
            width: 210mm; 
            min-height: 297mm; 
            margin: 0 auto; 
            font-size: 11px; 
            line-height: 1.3; 
          }
        </style>
      </head>
      <body>
        <!-- HEADER - GSTIN and Copy Type -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #000;">
          <div style="font-size: 10px; font-weight: bold;">GSTIN : ${company.gstin || ''}</div>
          <div style="font-size: 10px; font-weight: bold;">Original Copy</div>
        </div>

        <!-- COMPANY NAME AND DETAILS -->
        <div style="text-align: center; margin-bottom: 8px;">
          <h2 style="font-size: 16px; font-weight: bold; margin: 0 0 3px 0;">DUCO ART PRIVATE LIMITED</h2>
          <p style="margin: 1px 0; font-size: 10px;">SADIJA COMPOUND AVANTI VIHAR LIG 64</p>
          <p style="margin: 1px 0; font-size: 10px;">NEAR BANK OF BARODA , RAIPUR C.G</p>
          <p style="margin: 1px 0; font-size: 10px;">CIN : ${company.cin || 'U52601CT2020PTC010997'}</p>
          ${tax?.type === 'INTERNATIONAL' ? `
            ${company.pan ? `<p style="margin: 1px 0; font-size: 10px;">PAN : ${company.pan}</p>` : ''}
            ${company.iec ? `<p style="margin: 1px 0; font-size: 10px;">IEC : ${company.iec}</p>` : ''}
          ` : ''}
          <p style="margin: 1px 0; font-size: 10px;">email : ${company.email || ''}</p>
        </div>

        <!-- INVOICE DETAILS -->
        <div style="display: flex; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          <div style="flex: 1; padding-right: 10px; border-right: 1px solid #000;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="width: 100px;">Invoice No.</span>
              <span>: ${invoice.number || ''}</span>
            </div>
            <div style="display: flex;">
              <span style="width: 100px;">Dated</span>
              <span>: ${invoice.date || ''}</span>
            </div>
          </div>
          <div style="flex: 1; padding-left: 10px;">
            <div style="display: flex; margin-bottom: 2px;">
              <span style="width: 120px;">Place of Supply</span>
              <span>: ${invoice.placeOfSupply || ''}</span>
            </div>
            <div style="display: flex;">
              <span style="width: 120px;">Reverse Charge</span>
              <span>: N</span>
            </div>
          </div>
        </div>

        ${paymentCurrencySection}

        <!-- BILLED TO AND SHIPPED TO -->
        <div style="display: flex; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 5px;">
          <div style="flex: 1; padding-right: 10px; border-right: 1px solid #000;">
            <p style="font-weight: bold; margin: 0 0 3px 0;">Billed to :</p>
            <p style="margin: 1px 0; font-weight: bold;">${billTo.name || ''}</p>
            <p style="margin: 1px 0; font-size: 10px;">${billTo.address || ''}</p>
            ${billTo.gstin ? `<p style="margin: 3px 0 0 0; font-size: 10px;">GSTIN / UIN : ${billTo.gstin}</p>` : ''}
          </div>
          <div style="flex: 1; padding-left: 10px;">
            <p style="font-weight: bold; margin: 0 0 3px 0;">Shipped to :</p>
            <p style="margin: 1px 0; font-weight: bold;">${shipTo?.name || billTo.name || ''}</p>
            <p style="margin: 1px 0; font-size: 10px;">${shipTo?.address || billTo.address || ''}</p>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 4px; text-align: left; width: 25px;">S.N.</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: left;">Description of Goods</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 70px;">BARCODE NO.</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 50px;">HSN</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: center; width: 60px;">Qty. Unit</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 60px;">Price</th>
              <th style="border: 1px solid #000; padding: 4px; text-align: right; width: 70px;">Amount ( )</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            ${emptyRows}
          </tbody>
        </table>

        ${additionalFilesSection}

        <!-- TAX SUMMARY -->
        <div style="display: flex; margin-bottom: 8px;">
          <div style="flex: 1;"></div>
          <div style="width: 400px; border-left: 1px solid #000;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <!-- SUBTOTAL (saved value) -->
                <tr>
                  <td style="padding: 3px 8px; text-align: left;">Subtotal</td>
                  <td style="padding: 3px 8px; text-align: right;">-</td>
                  <td style="padding: 3px 8px; text-align: right;">${displaySubtotal.toFixed(2)}</td>
                </tr>
                
                ${displayDiscountAmount > 0 ? `
                  <tr style="background-color: #ffebee;">
                    <td style="padding: 4px 8px; font-weight: bold;">Discount (${discount?.code || 'Coupon'} - ${displayDiscountPercent.toFixed(2)}%)</td>
                    <td style="padding: 4px 8px; text-align: right;">-</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold; color: #d32f2f;">- ${displayDiscountAmount.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #f5f5f5;">
                    <td style="padding: 3px 8px; font-weight: bold; text-decoration: underline;">Subtotal After Discount</td>
                    <td style="padding: 3px 8px; text-align: right;">-</td>
                    <td style="padding: 3px 8px; text-align: right; font-weight: bold;">${displayDiscountedSubtotal.toFixed(2)}</td>
                  </tr>
                ` : ''}
                
                ${Number(charges?.pf ?? 0) > 0 ? `
                  <tr>
                    <td style="padding: 3px 8px; text-align: left;">P&F Charges</td>
                    <td style="padding: 3px 8px; text-align: right;">-</td>
                    <td style="padding: 3px 8px; text-align: right;">${Number(charges.pf).toFixed(2)}</td>
                  </tr>
                ` : ''}
                
                ${Number(charges?.printing ?? 0) > 0 ? `
                  <tr>
                    <td style="padding: 3px 8px; text-align: left;">Printing Charges</td>
                    <td style="padding: 3px 8px; text-align: right;">-</td>
                    <td style="padding: 3px 8px; text-align: right;">${Number(charges.printing).toFixed(2)}</td>
                  </tr>
                ` : ''}
                
                <tr style="background-color: #f9f9f9; font-style: italic;">
                  <td style="padding: 3px 8px; text-align: left; font-size: 11px;">Taxable Amount</td>
                  <td style="padding: 3px 8px; text-align: right;">-</td>
                  <td style="padding: 3px 8px; text-align: right; font-size: 11px;">${displayTaxableValue.toFixed(2)}</td>
                </tr>
                
                ${getTaxRows()}
                
                <!-- GRAND TOTAL (saved value) -->
                <tr style="border-top: 2px solid #000; font-weight: bold;">
                  <td style="padding: 4px 8px;">Grand Total</td>
                  <td style="padding: 4px 8px; text-align: right;">${displayTotalQty.toFixed(2)} Pcs.</td>
                  <td style="padding: 4px 8px; text-align: right;">${displayGrandTotal.toFixed(2)}</td>
                </tr>
                
                ${hasPartialPayment ? `
                  <tr style="background-color: #e8f5e9;">
                    <td style="padding: 4px 8px; font-weight: bold;">Paid Amount (50%)</td>
                    <td style="padding: 4px 8px; text-align: right;">-</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold;">${displayAmountPaid.toFixed(2)}</td>
                  </tr>
                  <tr style="background-color: #fff3e0;">
                    <td style="padding: 4px 8px; font-weight: bold;">Left Amount</td>
                    <td style="padding: 4px 8px; text-align: right;">-</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold;">${displayLeftAmount.toFixed(2)}</td>
                  </tr>
                ` : ''}
                
                ${!hasPartialPayment && showPaidAmount ? `
                  <tr style="background-color: #c8e6c9; border-top: 1px solid #4caf50;">
                    <td style="padding: 4px 8px; font-weight: bold;">${paymentmode === '50%' ? 'Paid Amount (100% - Fully Paid)' : 'Paid Amount'}</td>
                    <td style="padding: 4px 8px; text-align: right;">-</td>
                    <td style="padding: 4px 8px; text-align: right; font-weight: bold;">${displayGrandTotal.toFixed(2)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        ${getTaxBreakdownTable()}

        <!-- AMOUNT IN WORDS (saved grand total or paid amount for partial) -->
        <div style="margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #000; font-weight: bold;">
          ${currencyName} ${this.numberToWords(Math.round(hasPartialPayment ? displayAmountPaid : displayGrandTotal))} Only
        </div>

        <!-- TERMS AND SIGNATURE -->
        <div style="display: flex; min-height: 100px;">
          <div style="flex: 1; padding-right: 10px; border-right: 1px solid #000;">
            <p style="font-weight: bold; margin: 0 0 5px 0;">Terms & Conditions</p>
            <p style="margin: 2px 0; font-size: 10px;">E.& O.E.</p>
            ${termsSection}
          </div>
          <div style="flex: 1; padding-left: 10px; text-align: center;">
            <p style="margin: 0 0 40px 0; font-size: 10px;">Receiver's Signature :</p>
            <div style="border-top: 1px solid #000; margin-bottom: 20px; height: 40px;"></div>
            <p style="font-weight: bold; margin: 0 0 30px 0;">For DUCO ART PRIVATE LIMITED</p>
            <p style="font-size: 10px;">Authorised Signatory</p>
          </div>
        </div>

        <script>
          // Generate barcodes using JsBarcode (matches React component)
          try {
            document.querySelectorAll('.barcode-canvas').forEach((canvas) => {
              const value = canvas.getAttribute('data-barcode') || '000002';
              JsBarcode(canvas, value, {
                format: 'CODE128',
                width: 1,
                height: 25,
                displayValue: false,
                margin: 0,
              });
            });
          } catch (err) {
            console.warn('Barcode generation error:', err);
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
      
      // Wait for barcodes to render
      await page.evaluate(() => {
        return new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
      });

      // Generate PDF with proper margins to prevent content cutoff
      const pdfBuffer = await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
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
