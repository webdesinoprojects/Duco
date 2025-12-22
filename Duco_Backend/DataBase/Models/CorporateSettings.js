const mongoose = require('mongoose');

const DiscountTierSchema = new mongoose.Schema({
  minQty: { type: Number, required: true, min: 0 },
  maxQty: { type: Number, required: true, min: 0 },
  discount: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const CorporateSettingsSchema = new mongoose.Schema({
  minOrderQuantity: {
    type: Number,
    default: 100,
    min: 1
  },
  bulkDiscountTiers: {
    type: [DiscountTierSchema],
    default: [
      { minQty: 100, maxQty: 499, discount: 5 },
      { minQty: 500, maxQty: 999, discount: 10 },
      { minQty: 1000, maxQty: 9999, discount: 15 },
      { minQty: 10000, maxQty: 999999, discount: 20 }
    ]
  },
  corporateGstRate: {
    type: Number,
    default: 18,
    min: 0,
    max: 100
  },
  enablePrintroveIntegration: {
    type: Boolean,
    default: false
  },
  corporatePaymentMethods: {
    type: [String],
    default: ['online', 'netbanking', '50%', 'manual_payment'],
    enum: ['online', 'netbanking', '50%', 'manual_payment', 'COD', 'store_pickup']
  },
  // ✅ Default estimated delivery days for new orders
  estimatedDeliveryDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 365,
    description: 'Number of days for estimated delivery from order creation'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
CorporateSettingsSchema.statics.getSingletonSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('CorporateSettings', CorporateSettingsSchema);