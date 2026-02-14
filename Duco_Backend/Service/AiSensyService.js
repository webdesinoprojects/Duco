const axios = require('axios');

class AiSensyService {
  constructor() {
    this.apiKey = process.env.AISENSY_API_KEY;
    this.baseUrl = process.env.AISENSY_BASE_URL;
    this.templateName = process.env.AISENSY_TEMPLATE_NAME;
    this.senderNumber = process.env.AISENSY_SENDER_NUMBER;

    this.configured = !!(
      this.apiKey &&
      this.baseUrl &&
      this.templateName &&
      this.senderNumber
    );

    if (!this.configured) {
      console.warn('⚠️  AiSensy not configured. Missing required env vars.');
    }
  }

  formatPhoneNumber(phone) {
    if (!phone) return null;

    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }

    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }

    return cleaned;
  }

  async sendAiSensyOrderMessage({
    phoneNumber,
    customerName,
    orderId,
    finalAmount,
    invoiceUrl = null,
  }) {
    try {
      if (!this.configured) {
        console.warn('⚠️  AiSensy not configured, skipping send');
        return { success: false, message: 'AiSensy not configured' };
      }

      const destination = this.formatPhoneNumber(phoneNumber);
      if (!destination) {
        throw new Error('Invalid phone number');
      }

      const url = `${this.baseUrl.replace(/\/+$/, '')}/campaign/t1/api/v2`;
      const payload = {
        apiKey: this.apiKey,
        campaignName: this.templateName,
        destination,
        userName: customerName,
        templateParams: [
          String(customerName || ''),
          String(orderId || ''),
          String(finalAmount || ''),
        ],
      };

      if (invoiceUrl) {
        payload.media = {
          url: invoiceUrl,
          filename: 'invoice.pdf',
        };
      }

      payload.senderNumber = this.senderNumber;

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ AiSensy message sent successfully');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ AiSensy send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = new AiSensyService();
