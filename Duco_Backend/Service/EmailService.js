const nodemailer = require('nodemailer');
const fs = require('fs').promises;

/**
 * Email Service
 * Sends emails using Nodemailer (SMTP)
 */

class EmailService {
  constructor() {
    this.configureTransporter();
    this.verifyInBackground();
  }

  /**
   * Configure email transporter based on environment variables
   */
  configureTransporter() {
    // Check which email service is configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpPort = process.env.SMTP_PORT?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASSWORD?.trim();

    // Debug logging
    console.log('[EmailService] Configuration check:');
    console.log(`  GMAIL_USER: ${gmailUser ? 'SET' : 'NOT SET'}`);
    console.log(`  GMAIL_APP_PASSWORD: ${gmailPass ? 'SET' : 'NOT SET'}`);
    console.log(`  SMTP_HOST: ${smtpHost || 'NOT SET'}`);
    console.log(`  SMTP_PORT: ${smtpPort || 'NOT SET'}`);
    console.log(`  SMTP_USER: ${smtpUser || 'NOT SET'}`);
    console.log(`  SMTP_PASSWORD: ${smtpPass ? '***SET***' : 'NOT SET'}`);

    if (gmailUser && gmailPass) {
      // Gmail configuration
      console.log('📧 Configuring Gmail SMTP');
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass, // Use App Password, not regular password
        },
      });
      this.fromEmail = gmailUser;
      this.smtpMode = false;
    } else if (smtpHost && smtpUser && smtpPass) {
      // Generic SMTP configuration - use port 465 with SSL/TLS
      const portNum = 465;
      const secureFlag = true;
      console.log(`📧 Configuring SMTP:`);
      console.log(`  Host: ${smtpHost}`);
      console.log(`  Port: ${portNum}`);
      console.log(`  Secure (SSL/TLS): ${secureFlag}`);
      console.log(`  User: ${smtpUser}`);
      
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: portNum,
        secure: true, // SSL/TLS on port 465
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // TLS options for robustness
        tls: {
          rejectUnauthorized: false, // Accept self-signed certs
          minVersion: 'TLSv1.2'      // Minimum TLS version
        }
      });
      this.fromEmail = smtpUser;
      this.smtpMode = true;
      this.smtpConfig = { host: smtpHost, port: portNum, secure: secureFlag, user: smtpUser };
    } else {
      console.warn('⚠️  Email service not configured. Please add email credentials to .env');
      console.warn('  Missing: ', {
        hasSmtpHost: !!smtpHost,
        hasSmtpUser: !!smtpUser,
        hasSmtpPass: !!smtpPass
      });
      this.transporter = null;
      this.fromEmail = null;
      this.smtpMode = false;
    }

    this.configured = !!this.transporter;
  }

  /**
   * Verify SMTP connection in background (non-blocking)
   */
  async verifyInBackground() {
    // Run verification in background without blocking startup
    setImmediate(async () => {
      try {
        const isVerified = await this.verify();
        if (isVerified) {
          console.log('✅ SMTP connection successful');
        } else {
          console.log('⚠️  SMTP connection failed - email service may not work');
        }
      } catch (error) {
        console.error('❌ Background verification error:', error.message);
      }
    });
  }

  /**
   * Verify email configuration
   */
  async verify() {
    if (!this.transporter) {
      console.warn('⚠️  No transporter configured');
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      if (error.code === 'ETIMEDOUT') {
        console.error('   → Connection timeout. Check firewall/network settings');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   → Connection refused. Check if SMTP host is accessible');
      } else if (error.response?.includes('535')) {
        console.error('   → Authentication failed. Check SMTP username/password');
      } else if (error.message?.includes('CERT')) {
        console.error('   → TLS/SSL certificate issue');
      }
      return false;
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {String} options.to - Recipient email
   * @param {String} options.subject - Email subject
   * @param {String} options.text - Plain text content
   * @param {String} options.html - HTML content
   * @param {Array} options.attachments - Attachments
   * @returns {Object} - Response
   */
  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      if (!this.configured) {
        console.warn('⚠️  Email not configured, skipping send');
        return { success: false, message: 'Email service not configured' };
      }

      console.log(`📧 Sending email to ${to}: ${subject}`);

      const mailOptions = {
        from: `Duco <${this.fromEmail}>`,
        to,
        subject,
        text,
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order confirmation email
   * @param {Object} orderData - Order data
   * @param {String} orderData.customerEmail - Customer email
   * @param {String} orderData.customerName - Customer name
   * @param {String} orderData.orderId - Order ID
   * @param {String} orderData.totalAmount - Total amount
   * @param {String} orderData.currency - Currency
   * @param {String} orderData.paymentMode - Payment mode
  * @param {String} orderData.invoicePdfPath - Path to invoice PDF (optional)
   * @param {Array} orderData.items - Order items
   * @returns {Object} - Response
   */
  async sendOrderConfirmation(orderData) {
    try {
      const {
        customerEmail,
        customerName = 'Customer',
        orderId,
        totalAmount = '0',
        currency = 'INR',
        paymentMode = 'Online',
        invoicePdfPath = null,
        items = [],
        isPartialPayment50 = false,
        walletUrl = null,
        isPaymentComplete50 = false,
      } = orderData;

      if (!customerEmail) {
        return { success: false, error: 'Customer email not provided' };
      }

      console.log('Attempting to send order email to:', customerEmail);

      const currencySymbol = currency === 'INR' ? '₹' : '$';
      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://ducoart.com';
      const resolvedWalletUrl = walletUrl || `${baseUrl.replace(/\/$/, '')}/account/wallet`;

      // Generate items HTML
      const itemsHtml = items.map((item, index) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${item.price || 0}</td>
        </tr>
      `).join('');

      // --- Template: 50% Partial Payment Confirmed (initial advance) ---
      let htmlContent;
      let textContent;
      let subject = `Order Confirmation - ${orderId} | Duco`;

      if (isPartialPayment50) {
        subject = `50% Partial Payment Confirmed - Order #${orderId} | Duco`;
        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-info p { margin: 10px 0; }
            .order-info strong { color: #667eea; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .cta-box { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>50% Partial Payment Confirmed</h1>
              <p>Your advance payment has been received</p>
            </div>
            <div class="content">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your order has been placed successfully. We have received your <strong>50% advance payment</strong>.</p>
              <div class="order-info">
                <h3 style="color: #667eea; margin-top: 0;">Order Details</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Amount Paid (50%):</strong> ${currencySymbol}${totalAmount}</p>
                <p><strong>Payment Method:</strong> 50% Advance</p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div class="cta-box">
                <p style="margin: 0 0 12px 0;"><strong>Action required</strong></p>
                <p style="margin: 0;">Please pay the remaining balance before delivery to avoid any delay. You can clear your dues directly via your wallet.</p>
                <a href="${resolvedWalletUrl}" class="button">Pay Remaining Balance → Wallet</a>
              </div>
              <p>If you have any questions, contact us at <a href="mailto:support@ducoart.com">support@ducoart.com</a></p>
              <p>Thank you for shopping with Duco! 🎨</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Duco. All rights reserved.</p>
              <p>Raipur, Chhattisgarh, India</p>
            </div>
          </div>
        </body>
        </html>
        `;
        textContent = `
50% Partial Payment Confirmed - Order #${orderId}

Hello ${customerName},

Your 50% advance payment has been received and your order is confirmed.

Order ID: ${orderId}
Amount Paid (50%): ${currencySymbol}${totalAmount}

Please pay the remaining balance via your wallet: ${resolvedWalletUrl}

Thank you for shopping with Duco!
Contact: support@ducoart.com
        `.trim();
      } else if (isPaymentComplete50) {
        subject = `Payment Complete – Thank You! Order #${orderId} | Duco`;
        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-info p { margin: 10px 0; }
            .order-info strong { color: #059669; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Complete – Thank You!</h1>
              <p>Your order is fully paid</p>
            </div>
            <div class="content">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>We have received your remaining payment. Your order is now <strong>fully paid</strong> and we will process it for dispatch.</p>
              <div class="order-info">
                <h3 style="color: #059669; margin-top: 0;">Order Details</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Total Amount:</strong> ${currencySymbol}${totalAmount}</p>
                <p><strong>Payment Status:</strong> Fully Paid</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <p>You will receive shipping updates via email and WhatsApp.</p>
              <p>Thank you for shopping with Duco! 🎨</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Duco. All rights reserved.</p>
              <p>Raipur, Chhattisgarh, India</p>
            </div>
          </div>
        </body>
        </html>
        `;
        textContent = `
Payment Complete – Thank You! Order #${orderId}

Hello ${customerName},

We have received your remaining payment. Your order is now fully paid.

Order ID: ${orderId}
Total Amount: ${currencySymbol}${totalAmount}

Thank you for shopping with Duco!
        `.trim();
      } else {
        // --- Default: standard order confirmation ---
        htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-info p { margin: 10px 0; }
            .order-info strong { color: #667eea; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
            .items-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Order Confirmed!</h1>
              <p>Thank you for your order</p>
            </div>
            <div class="content">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your order has been successfully placed and is being processed.</p>
              <div class="order-info">
                <h3 style="color: #667eea; margin-top: 0;">Order Details</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Amount:</strong> ${currencySymbol}${totalAmount}</p>
                <p><strong>Payment Method:</strong> ${paymentMode}</p>
                <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}</p>
              </div>

              <div style="background: #fffbf0; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                <p style="margin: 0;"><strong>What's Next?</strong></p>
                <p style="margin: 10px 0 0 0;">
                  We're processing your order and will send you updates via email and WhatsApp.
                  You'll receive a shipping notification once your order is dispatched.
                </p>
              </div>

              <p>If you have any questions, feel free to reach out to us at <a href="mailto:support@ducoart.com">support@ducoart.com</a></p>
              <p>Thank you for shopping with Duco! 🎨</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Duco. All rights reserved.</p>
              <p>Raipur, Chhattisgarh, India</p>
            </div>
          </div>
        </body>
        </html>
      `;

        textContent = `
Order Confirmed!

Hello ${customerName},

Your order has been successfully placed.

Order Details:
- Order ID: ${orderId}
- Amount: ${currencySymbol}${totalAmount}
- Payment: ${paymentMode}
- Date: ${new Date().toLocaleDateString()}

Thank you for shopping with Duco!

For any queries, contact us at support@ducoart.com
      `.trim();
      }

      const attachments = [];
      if (invoicePdfPath) {
        console.log('📎 EMAIL SERVICE - Attaching PDF from path:', invoicePdfPath);
        try {
          await fs.access(invoicePdfPath);
          attachments.push({
            filename: `invoice-${orderId}.pdf`,
            path: invoicePdfPath,
            contentType: 'application/pdf',
          });
          console.log('✅ EMAIL SERVICE - PDF file verified and attached');
        } catch (err) {
          console.warn('⚠️  Invoice PDF not found:', invoicePdfPath);
        }
      }

      const sendResult = await this.sendEmail({
        to: customerEmail,
        subject,
        text: textContent,
        html: htmlContent,
        attachments,
      });

      if (sendResult.success) {
        console.log('Email sent successfully for order:', orderId);
        return { success: true };
      }

      console.error('Email failed for order:', orderId, sendResult.error || sendResult.message);
      return { success: false, error: sendResult.error || sendResult.message || 'Email send failed' };
    } catch (error) {
      console.error('Email failed for order:', orderId, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   * @param {Object} updateData - Update data
   * @returns {Object} - Response
   */
  async sendOrderStatusUpdate(updateData) {
    try {
      const {
        customerEmail,
        customerName = 'Customer',
        orderId,
        status,
        trackingInfo = null,
      } = updateData;

      if (!customerEmail) {
        return { success: false, error: 'Customer email not provided' };
      }

      const statusText = {
        'processing': 'Being Processed ⚙️',
        'shipped': 'Shipped 🚚',
        'delivered': 'Delivered ✅',
        'cancelled': 'Cancelled ❌',
      }[status.toLowerCase()] || status;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Update</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${customerName}</strong>,</p>
              <p>Your order <strong>${orderId}</strong> is now: <strong>${statusText}</strong></p>
              ${trackingInfo ? `<p>Tracking: ${trackingInfo}</p>` : ''}
              <p>Thank you for shopping with Duco! 🎨</p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: customerEmail,
        subject: `Order Update: ${orderId} - ${statusText}`,
        text: `Order ${orderId} is now ${statusText}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error('❌ Error sending status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send delivery reminder email ("Coming Soon" - order arriving in 24-48h)
   * @param {Object} data - { to, customerName, orderId, deliveryDateFormatted, productSummary, trackOrderUrl }
   * @returns {Object} - { success, messageId? } or { success: false, error }
   */
  async sendDeliveryReminder(data) {
    try {
      const {
        to,
        customerName = 'Customer',
        orderId,
        deliveryDateFormatted,
        productSummary,
        trackOrderUrl,
        hasPendingBalance = false,
        walletUrl = null,
        isB2B = false,
      } = data;

      if (!to) {
        return { success: false, error: 'Recipient email not provided' };
      }

      const subject = `Get Ready! Your Order #${orderId} arrives soon 📦`;
      const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://ducoart.com';
      const resolvedWalletUrl = walletUrl || `${baseUrl.replace(/\/$/, '')}/account/wallet`;

      const pendingBalanceBlock = hasPendingBalance && resolvedWalletUrl ? `
                <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>Action required</strong></p>
                  <p style="margin: 0;">Please note: A pending balance remains on this order. To ensure smooth delivery, please clear your dues directly via your wallet as soon as possible.</p>
                  <a href="${resolvedWalletUrl}" class="cta" style="display: inline-block; background: #d97706; color: #fff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 12px;">Pay Balance → Wallet</a>
                </div>
      ` : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .wrapper { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
            .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 28px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { padding: 28px 24px; }
            .content p { margin: 0 0 14px 0; font-size: 15px; }
            .highlight { background: #f0f7ff; border-left: 4px solid #2563eb; padding: 14px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 15px; }
            .highlight strong { color: #1e40af; }
            .meta { margin: 20px 0; }
            .meta-row { display: flex; margin-bottom: 10px; font-size: 14px; }
            .meta-label { font-weight: 600; color: #64748b; min-width: 140px; }
            .meta-value { color: #1e293b; }
            .cta { display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; }
            .cta:hover { background: #1d4ed8; }
            .footer { padding: 20px 24px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <h1>📦 Your order is on its way</h1>
                <p>Arriving in the next 24–48 hours</p>
              </div>
              <div class="content">
                <p>Hello <strong>${customerName}</strong>,</p>
                <p>Good news — your order is scheduled for delivery soon. Here are the details:</p>
                <div class="highlight">
                  <strong>Arriving on ${deliveryDateFormatted}</strong>
                </div>
                <div class="meta">
                  <div class="meta-row"><span class="meta-label">Order ID</span><span class="meta-value">#${orderId}</span></div>
                  <div class="meta-row"><span class="meta-label">Items</span><span class="meta-value">${productSummary}</span></div>
                </div>
                ${pendingBalanceBlock}
                ${!isB2B ? `
                <p>You can track your order and view full details using the button below.</p>
                <a href="${trackOrderUrl}" class="cta">Track Your Order</a>
                ` : ''}
                <p style="margin-top: 24px;">Thank you for shopping with Duco! 🎨</p>
              </div>
              <div class="footer">
                <p style="margin: 0;">Duco Art · Raipur, Chhattisgarh, India</p>
                <p style="margin: 6px 0 0 0;"><a href="mailto:support@ducoart.com" style="color: #2563eb;">support@ducoart.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const pendingBalanceText = hasPendingBalance && resolvedWalletUrl
        ? `\n\nAction required: A pending balance remains on this order. Please clear your dues via your wallet: ${resolvedWalletUrl}\n`
        : '';

      const textContent = `
Get Ready! Your Order #${orderId} arrives soon

Hello ${customerName},

Your order is scheduled for delivery in the next 24–48 hours.

Arriving on: ${deliveryDateFormatted}
Order ID: #${orderId}
Items: ${productSummary}
${pendingBalanceText}${!isB2B ? `
Track your order: ${trackOrderUrl}` : ''}

Thank you for shopping with Duco!
      `.trim();

      return await this.sendEmail({
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
    } catch (error) {
      console.error('❌ Error sending delivery reminder email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
