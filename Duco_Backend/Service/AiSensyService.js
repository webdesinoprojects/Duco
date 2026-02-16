const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const Order = require('../DataBase/Models/OrderModel');

class AiSensyService {
  constructor() {
    this.apiKey = process.env.AISENSY_API_KEY;
    this.apiUrl = process.env.AISENSY_API_URL;
    this.templateOrder = process.env.AISENSY_TEMPLATE_ORDER_CONFIRM;
    this.templateInvoice = process.env.AISENSY_TEMPLATE_INVOICE;
    this.senderNumber = process.env.AISENSY_SENDER_NUMBER;

    this.configuredOrder = !!(
      this.apiKey &&
      this.apiUrl &&
      this.templateOrder &&
      this.senderNumber
    );

    this.configuredInvoice = !!(
      this.apiKey &&
      this.apiUrl &&
      this.templateInvoice &&
      this.senderNumber
    );

    if (!this.configuredOrder) {
      console.warn('⚠️  AiSensy order confirmation not configured. Missing required env vars.');
    }

    if (!this.configuredInvoice) {
      console.warn('⚠️  AiSensy invoice send not configured. Missing required env vars.');
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
      if (!this.configuredOrder) {
        console.warn('⚠️  AiSensy not configured, skipping send');
        return { success: false, message: 'AiSensy not configured' };
      }

      const destination = this.formatPhoneNumber(phoneNumber);
      if (!destination) {
        throw new Error('Invalid phone number');
      }

      const order = await this.findOrderByIdOrOrderId(orderId);
      if (order?.whatsappSent) {
        console.log('ℹ️ AiSensy order confirmation already sent, skipping');
        return { success: true, message: 'Order confirmation already sent' };
      }

      const payload = {
        apiKey: this.apiKey,
        campaignName: this.templateOrder,
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

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('✅ AiSensy message sent successfully');
      if (order?._id) {
        await Order.updateOne(
          { _id: order._id },
          { $set: { whatsappSent: true } }
        );
      }

      const invoiceResult = await this.sendAiSensyInvoiceDocument({
        destination,
        orderId,
        customerName,
        finalAmount,
        order,
      });

      return {
        success: true,
        data: response.data,
        invoice: invoiceResult,
      };
    } catch (error) {
      console.error('❌ AiSensy send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async sendAiSensyInvoiceDocument({
    destination,
    orderId,
    customerName,
    finalAmount,
    order = null,
  }) {
    try {
      if (!this.configuredInvoice) {
        console.warn('⚠️  AiSensy invoice not configured, skipping send');
        return { success: false, message: 'AiSensy invoice not configured' };
      }

      if (order?.whatsappInvoiceSent) {
        console.log('ℹ️ AiSensy invoice already sent, skipping');
        return { success: true, message: 'Invoice already sent' };
      }

      const invoicePath = await this.getInvoicePath(order, orderId);
      if (!invoicePath) {
        console.warn('⚠️  Invoice PDF not found, skipping WhatsApp invoice');
        return { success: false, message: 'Invoice PDF not found' };
      }

      const fileBuffer = await fs.readFile(invoicePath);
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: 'invoice.pdf',
        contentType: 'application/pdf',
      });

      formData.append('apiKey', this.apiKey);
      formData.append('campaignName', this.templateInvoice);
      formData.append('destination', destination);
      formData.append('userName', customerName || 'Customer');
      formData.append('senderNumber', this.senderNumber);
      formData.append('templateParams', JSON.stringify([
        String(customerName || ''),
        String(orderId || ''),
        String(finalAmount || ''),
      ]));

      const response = await axios.post(this.apiUrl, formData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log('✅ AiSensy invoice PDF sent successfully');
      if (order?._id) {
        await Order.updateOne(
          { _id: order._id },
          { $set: { whatsappInvoiceSent: true } }
        );
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ AiSensy invoice send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async findOrderByIdOrOrderId(orderId) {
    if (!orderId) return null;

    const asObjectId = String(orderId).match(/^[a-f0-9]{24}$/i);
    if (asObjectId) {
      const order = await Order.findById(orderId).catch(() => null);
      if (order) return order;
    }

    return Order.findOne({ orderId }).catch(() => null);
  }

  async getInvoicePath(order, orderId) {
    const invoiceId = order?._id ? String(order._id) : String(orderId || '');
    if (!invoiceId) return null;

    const invoicePath = path.join(__dirname, '..', 'invoices', `invoice-${invoiceId}.pdf`);
    try {
      await fs.access(invoicePath);
      return invoicePath;
    } catch {
      return null;
    }
  }
}

module.exports = new AiSensyService();
