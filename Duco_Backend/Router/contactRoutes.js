const express = require('express');
const router = express.Router();
const emailService = require('../Service/EmailService');

/**
 * POST /api/contact
 * Receives { name, email, message } and sends it to the business email.
 */
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }

    const result = await emailService.sendEmail({
      to: process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER || 'duco@ducoart.com',
      subject: `New Contact Enquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#E5C870;border-bottom:2px solid #E5C870;padding-bottom:10px;">New Contact Enquiry</h2>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px 0;color:#666;width:100px;"><strong>Name:</strong></td><td style="padding:8px 0;">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Email:</strong></td><td style="padding:8px 0;"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin-top:12px;">
            <p style="margin:0 0 8px;color:#666;"><strong>Message:</strong></p>
            <p style="margin:0;white-space:pre-wrap;">${message}</p>
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px;">Sent from the Duco website contact form.</p>
        </div>
      `,
    });

    if (result.success) {
      return res.json({ success: true, message: 'Message sent successfully!' });
    } else {
      console.error('Contact email failed:', result.error);
      return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
    }
  } catch (err) {
    console.error('Contact route error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

module.exports = router;
