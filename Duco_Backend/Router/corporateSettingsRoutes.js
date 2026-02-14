const express = require('express');
const router = express.Router();
const {
  getCorporateSettings,
  getDiscountTiers,
  updateCorporateSettings,
  getDiscountForQuantity
} = require('../Controller/corporateSettingsController');

// Get corporate settings
router.get('/corporate-settings', getCorporateSettings);

// ✅ Get bulk discount tiers (for frontend Price Chart)
router.get('/corporate-settings/discount-tiers', getDiscountTiers);

// Update corporate settings
router.post('/corporate-settings', updateCorporateSettings);

// Get discount for specific quantity
router.get('/corporate-settings/discount', getDiscountForQuantity);

module.exports = router;