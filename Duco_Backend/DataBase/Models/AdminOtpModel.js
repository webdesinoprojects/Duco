const mongoose = require('mongoose');

const AdminOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // OTP expires after 10 minutes
  },
  verified: {
    type: Boolean,
    default: false
  }
});

// Index for faster lookups
AdminOtpSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('AdminOtp', AdminOtpSchema);
