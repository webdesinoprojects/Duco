const express = require('express');
const router = express.Router();
const {
  getCorporateSettings,
  updateCorporateSettings,
  getDiscountForQuantity
} = require('../Controller/corporateSettingsController');

// Get corporate settings
router.get('/corporate-settings', getCorporateSettings);

// Update corporate settings
router.post('/corporate-settings', updateCorporateSettings);

// Get discount for specific quantity
router.get('/corporate-settings/discount', getDiscountForQuantity);

module.exports = router;