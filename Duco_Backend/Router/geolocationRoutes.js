const express = require('express');
const router = express.Router();
const axios = require('axios');

// ✅ In-memory cache for geolocation data (prevents rate-limiting)
const geoCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

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

    // ✅ Check cache first
    const cached = geoCache.get(clientIp);
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log('✅ Returning cached geolocation for IP:', clientIp);
      return res.json(cached.data);
    }

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
    const result = {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'IN',
      city: data.city || '',
      ip: data.ip || clientIp,
      success: true
    };

    // ✅ Cache the result
    geoCache.set(clientIp, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
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
