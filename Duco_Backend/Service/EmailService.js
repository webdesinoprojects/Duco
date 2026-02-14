const nodemailer = require('nodemailer');
const fs = require('fs').promises;

/**
 * Email Service
 * Sends emails using Nodemailer (SMTP)
 */

class EmailService {
  constructor() {
    this.configureTransporter();
  }

  /**
   * Configure email transporter based on environment variables
   */
  configureTransporter() {
    // Check which email service is configured
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASSWORD;

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
    } else if (smtpHost && smtpUser && smtpPass) {
      // Generic SMTP configuration
      console.log(`📧 Configuring SMTP: ${smtpHost}:${smtpPort || 587}`);
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.fromEmail = smtpUser;
    } else {
      console.warn('⚠️  Email service not configured. Please add email credentials to .env');
      this.transporter = null;
      this.fromEmail = null;
    }

    this.configured = !!this.transporter;
  }

  /**
   * Verify email configuration
   */
  async verify() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connected and ready');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
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
      } = orderData;

      if (!customerEmail) {
        return { success: false, error: 'Customer email not provided' };
      }

      console.log('Attempting to send order email to:', customerEmail);

      const currencySymbol = currency === 'INR' ? '₹' : '$';

      // Generate items HTML
      const itemsHtml = items.map((item, index) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || 'Product'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${currencySymbol}${item.price || 0}</td>
        </tr>
      `).join('');

      const htmlContent = `
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

      const textContent = `
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
        subject: `Order Confirmation - ${orderId} | Duco`,
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
}

module.exports = new EmailService();
