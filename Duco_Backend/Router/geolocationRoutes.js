const express = require('express');
const router = express.Router();
const axios = require('axios');

// ✅ Geolocation endpoint - detects user's country from IP
router.get('/geolocation', async (req, res) => {
  try {
    // Get client IP from request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip ||
                     '0.0.0.0';

    console.log('🌍 Geolocation request from IP:', clientIp);

    // ✅ Use ipapi.co with CORS headers (backend can make requests without CORS issues)
    const response = await axios.get(`https://ipapi.co/${clientIp}/json/`, {
      timeout: 5000
    });

    const data = response.data;

    console.log('📍 IP Geolocation response:', {
      country: data.country_name,
      countryCode: data.country_code,
      city: data.city,
      ip: data.ip
    });

    // ✅ Return standardized format
    res.json({
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'IN',
      city: data.city || '',
      ip: data.ip || clientIp,
      success: true
    });
  } catch (error) {
    console.error('❌ Geolocation error:', error.message);
    
    // ✅ Fallback to India if detection fails
    res.json({
      country: 'India',
      countryCode: 'IN',
      city: '',
      ip: req.ip || '0.0.0.0',
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
