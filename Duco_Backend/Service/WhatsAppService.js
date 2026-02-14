const axios = require('axios');
const fs = require('fs').promises;
const FormData = require('form-data');

/**
 * WhatsApp Service
 * Sends WhatsApp messages and media using WhatsApp Business API
 */

class WhatsAppService {
  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    this.apiVersion = process.env.WHATSAPP_API_VERSION;
    this.baseUrl = process.env.WHATSAPP_BASE_URL;
    
    this.configured = !!(
      this.accessToken &&
      this.phoneNumberId &&
      this.apiVersion &&
      this.baseUrl
    );

    if (!this.configured) {
      console.warn('⚠️  WhatsApp not configured. Missing required env vars.');
    }
  }

  /**
   * Format phone number to international format
   * @param {String} phone - Phone number
   * @returns {String} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with country code
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1); // India country code
    }
    
    // If doesn't start with country code, add India code
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send text message
   * @param {String} phoneNumber - Recipient phone number
   * @param {String} message - Message text
   * @returns {Object} - Response from WhatsApp API
   */
  async sendTextMessage(phoneNumber, message) {
    try {
      if (!this.configured) {
        console.warn('⚠️  WhatsApp not configured, skipping message send');
        return { success: false, message: 'WhatsApp not configured' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number');
      }

      console.log(`📱 Sending WhatsApp message to ${formattedPhone}`);

      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ WhatsApp message sent successfully');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send document (PDF)
   * @param {String} phoneNumber - Recipient phone number
   * @param {String} filePath - Path to PDF file
   * @param {String} caption - Optional caption
   * @returns {Object} - Response from WhatsApp API
   */
  async sendDocument(phoneNumber, filePath, caption = '') {
    try {
      if (!this.configured) {
        console.warn('⚠️  WhatsApp not configured, skipping document send');
        return { success: false, message: 'WhatsApp not configured' };
      }

      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      if (!formattedPhone) {
        throw new Error('Invalid phone number');
      }

      console.log(`📄 Sending WhatsApp document to ${formattedPhone}`);

      // First, upload the document to get media ID
      const mediaId = await this.uploadMedia(filePath);
      
      if (!mediaId) {
        throw new Error('Failed to upload media');
      }

      // Then send the message with media ID
      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;
      
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'document',
          document: {
            id: mediaId,
            caption: caption,
            filename: 'invoice.pdf'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ WhatsApp document sent successfully');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Error sending WhatsApp document:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Upload media file to WhatsApp
   * @param {String} filePath - Path to file
   * @returns {String} - Media ID
   */
  async uploadMedia(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const formData = new FormData();
      
      formData.append('file', fileBuffer, {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });
      formData.append('messaging_product', 'whatsapp');

      const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/media`;
      
      const response = await axios.post(url, formData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          ...formData.getHeaders(),
        },
      });

      console.log('✅ Media uploaded successfully:', response.data.id);
      return response.data.id;
    } catch (error) {
      console.error('❌ Error uploading media:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Send order confirmation message
   * @param {String} phoneNumber - Customer phone number
   * @param {String} orderId - Order ID
   * @param {String} pdfPath - Path to invoice PDF (optional)
   * @param {Object} orderDetails - Order details
   * @returns {Object} - Response
   */
  async sendOrderConfirmation(phoneNumber, orderId, pdfPath = null, orderDetails = {}) {
    try {
      const {
        customerName = 'Customer',
        totalAmount = '0',
        currency = 'INR',
        paymentMode = 'Online',
        trackingUrl = ''
      } = orderDetails;

      const currencySymbol = currency === 'INR' ? '₹' : '$';

      // Send text message
      const message = `
🎉 *Order Confirmed!*

Hello ${customerName}! 👋

Your order has been successfully placed.

📦 *Order ID:* ${orderId}
💰 *Amount:* ${currencySymbol}${totalAmount}
💳 *Payment:* ${paymentMode}

${trackingUrl ? `🔗 Track your order: ${trackingUrl}` : ''}

Thank you for shopping with Duco! 🎨
We'll send you updates as your order is processed.

For any queries, contact us at support@ducoart.com
      `.trim();

      const textResult = await this.sendTextMessage(phoneNumber, message);

      // Send PDF if provided
      let docResult = null;
      if (pdfPath) {
        docResult = await this.sendDocument(
          phoneNumber, 
          pdfPath, 
          `Invoice for Order #${orderId}`
        );
      }

      return {
        success: textResult.success || docResult?.success,
        textMessage: textResult,
        document: docResult
      };
    } catch (error) {
      console.error('❌ Error sending order confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update
   * @param {String} phoneNumber - Customer phone number
   * @param {String} orderId - Order ID
   * @param {String} status - Order status
   * @param {String} additionalInfo - Additional information
   * @returns {Object} - Response
   */
  async sendOrderStatusUpdate(phoneNumber, orderId, status, additionalInfo = '') {
    try {
      const statusEmoji = {
        'processing': '⚙️',
        'shipped': '🚚',
        'delivered': '✅',
        'cancelled': '❌',
      }[status.toLowerCase()] || '📦';

      const message = `
${statusEmoji} *Order Update*

Order ID: ${orderId}
Status: *${status.toUpperCase()}*

${additionalInfo}

Thank you for shopping with Duco! 🎨
      `.trim();

      return await this.sendTextMessage(phoneNumber, message);
    } catch (error) {
      console.error('❌ Error sending status update:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WhatsAppService();
