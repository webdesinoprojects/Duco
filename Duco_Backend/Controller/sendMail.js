// Controller/sendMail.js
const nodemailer = require("nodemailer");
require("dotenv").config();

// ✅ Initialize Nodemailer with SMTP credentials
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_PORT === "465" || process.env.SMTP_PORT === 465, // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  console.log("✅ SMTP configured successfully for email: " + process.env.SMTP_USER);
} else {
  console.warn("⚠️  SMTP credentials not configured. Email sending will be disabled.");
}

async function sendOtpEmail(to, otp) {
  // ✅ Return mock response if SMTP is not configured
  if (!transporter) {
    console.log(`⚠️  Email sending disabled. OTP would be sent to: ${to}, OTP: ${otp}`);
    return {
      id: "mock_" + Date.now(),
      from: process.env.SMTP_USER,
      to,
      subject: "Your OTP for Login",
      status: "mock_success"
    };
  }

  const from = process.env.SMTP_USER;

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Your OTP</h2>
      <p style="margin:0 0 12px">Use this code within <b>5 minutes</b>:</p>
      <div style="font-size:22px;font-weight:700;letter-spacing:2px">${otp}</div>
      <p style="color:#666;margin-top:16px">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject: "Your OTP for Login",
      html,
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });
    
    console.log("✅ OTP email sent successfully to:", to, "MessageId:", result.messageId);
    return result;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error.message);
    throw error;
  }
}

module.exports = sendOtpEmail;
