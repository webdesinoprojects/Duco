const express = require('express');
const router = express.Router();
const {
  sendOTP,
  verifyOTP,
  resetPassword
} = require('../Controller/adminForgotPasswordController');

// Send OTP to admin email
router.post('/admin/forgot-password/send-otp', sendOTP);

// Verify OTP
router.post('/admin/forgot-password/verify-otp', verifyOTP);

// Reset password
router.post('/admin/forgot-password/reset', resetPassword);

module.exports = router;
