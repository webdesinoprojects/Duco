const mongoose = require('mongoose');

// Address Subdocument Schema
const AddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },

  mobileNumber: {
    type: String,

  },
  houseNumber: {
    type: String,
    required: true
  },
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  },
  landmark: {
    type: String,
    default: ''
  },
  addressType: {
    type: String,
    enum: ['Home', 'Office', 'Other'],
    default: 'Home'
  }
}, {
  _id: false,
  timestamps: true
});

// User Schema with embedded Address
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
   
  },
    isVerified: { type: Boolean, default: false }, // OTP verification status
  email: { type: String }, // Allow email login
  address: [AddressSchema]  // Array of address objects
}, {
  timestamps: true
});

// ------------------ Indexes for Performance ------------------
UserSchema.index({ createdAt: -1 }); // Index for sorting by creation date (newest first)
UserSchema.index({ email: 1 }); // Index for email lookups
UserSchema.index({ name: 1 }); // Index for name searches
UserSchema.index({ isVerified: 1 }); // Index for filtering verified users

module.exports = mongoose.model('User', UserSchema);
