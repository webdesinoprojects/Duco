const express = require('express');
const router = express.Router();
const {
  getLandingPage,
  updateLandingPage,
  resetLandingPage,
} = require('../Controller/LandingPageController');

// Get landing page data
router.get('/landing-page', getLandingPage);

// Update landing page data
router.post('/landing-page', updateLandingPage);

// Reset to defaults
router.post('/landing-page/reset', resetLandingPage);

module.exports = router;
