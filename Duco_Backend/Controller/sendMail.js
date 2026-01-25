// Controller/sendMail.js
const { Resend } = require("resend");
require("dotenv").config();

// ✅ Initialize Resend with API key if available
let resend = null;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_placeholder_add_your_key_here") {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn("⚠️  RESEND_API_KEY not set. Email sending will be disabled.");
}

async function sendOtpEmail(to, otp) {
  // ✅ Return mock response if Resend is not configured
  if (!resend) {
    console.log(`⚠️  Email sending disabled. OTP would be sent to: ${to}, OTP: ${otp}`);
    return {
      id: "mock_" + Date.now(),
      from: process.env.RESEND_FROM || "Duco <no-reply@ducoart.com>",
      to,
      subject: "Your OTP for Login",
      status: "mock_success"
    };
  }

  const from = process.env.RESEND_FROM || "Duco <no-reply@ducoart.com>";

  const html = `
    <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 8px">Your OTP</h2>
      <p style="margin:0 0 12px">Use this code within <b>5 minutes</b>:</p>
      <div style="font-size:22px;font-weight:700;letter-spacing:2px">${otp}</div>
      <p style="color:#666;margin-top:16px">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  return resend.emails.send({
    from,         // now your verified domain
    to,
    subject: "Your OTP for Login",
    html,
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    // replyTo: "support@ducoart.com", // optional
    tags: [{ name: "type", value: "otp" }],    // optional but handy
  });
}

module.exports = sendOtpEmail;
