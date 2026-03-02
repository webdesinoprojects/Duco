const express = require('express');
const router = express.Router();
const axios = require('axios');

// ===================================================================
// GEOLOCATION SERVICE - Detects user's country from IP address
// ===================================================================
// ⚠️  NOTE: This endpoint is now LEGACY/OPTIONAL
// 
// The frontend now calls ipapi.co DIRECTLY from browser, which:
// ✅ Detects user's REAL VPN IP (browser requests see actual VPN)
// ❌ Backend endpoint sees backend's server IP (not useful for VPN)
// 
// This endpoint remains for fallback/debugging purposes only.
// Remove if not used elsewhere in codebase.
// ===================================================================

// ✅ In-memory cache for geolocation data (prevents rate-limiting)
const geoCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // ✅ REDUCED: 10 minutes (was 1 hour) - allows VPN changes to be detected faster

// ✅ Geolocation endpoint - detects user's country from IP
router.get('/geolocation', async (req, res) => {
  try {
    // ✅ Allow cache bypass with ?noCache=true (for testing VPN changes)
    const bypassCache = req.query.noCache === 'true';
    
    // Get client IP from request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     req.ip ||
                     '0.0.0.0';

    console.log('🌍 Geolocation request from IP:', clientIp, bypassCache ? '(bypassing cache)' : '');

    // ✅ CRITICAL FIX: Don't use localhost IP - let ipapi.co detect the real external IP
    // When backend is on localhost, clientIp is 127.0.0.1 which doesn't help
    // Instead, call ipapi.co without IP to auto-detect the real external IP (works with VPN)
    const isLocalhost = clientIp === '127.0.0.1' || 
                        clientIp === '::1' || 
                        clientIp === '::ffff:127.0.0.1' ||
                        clientIp.startsWith('192.168.') ||
                        clientIp.startsWith('10.') ||
                        clientIp.startsWith('172.');

    // ✅ Use ipapi.co WITHOUT specific IP to auto-detect from request origin
    // This way it detects the VPN IP correctly even when backend is on localhost
    const apiUrl = isLocalhost ? 'https://ipapi.co/json/' : `https://ipapi.co/${clientIp}/json/`;
    
    console.log('📡 Using API URL:', apiUrl, isLocalhost ? '(auto-detect mode for localhost/LAN)' : '(direct IP lookup)');

    // ✅ Check cache first (unless bypassed)
    if (!bypassCache) {
      const cached = geoCache.get(apiUrl);
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log('✅ Returning cached geolocation');
        return res.json(cached.data);
      }
    }

    // ✅ Use ipapi.co with CORS headers (backend can make requests without CORS issues)
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'DucoBackend/1.0'
      }
    });

    const data = response.data;

    console.log('📍 IP Geolocation response:', {
      country: data.country_name,
      countryCode: data.country_code,
      city: data.city,
      ip: data.ip,
      detectedVia: isLocalhost ? 'auto-detect (VPN-aware)' : 'direct IP lookup'
    });

    // ✅ Return standardized format
    const result = {
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'IN',
      city: data.city || '',
      ip: data.ip || clientIp,
      success: true
    };

    // ✅ Cache the result using apiUrl as key (not clientIp, since localhost IP doesn't change)
    geoCache.set(apiUrl, {
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
