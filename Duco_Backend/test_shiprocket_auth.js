/**
 * 🚀 Quick Test Script for Shiprocket Integration
 * 
 * This tests if Shiprocket API authentication works
 * Run this: node test_shiprocket_auth.js
 */

require('dotenv').config();
const axios = require('axios');

console.log('🔍 Testing Shiprocket API Authentication...\n');

const testShiprocketAuth = async () => {
  try {
    console.log('📧 Email:', process.env.SHIPROCKET_EMAIL);
    console.log('🔐 Password:', process.env.SHIPROCKET_PASSWORD ? '***' : 'NOT SET');
    console.log('\n⏳ Connecting to Shiprocket API...\n');

    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );

    if (response.data.token) {
      console.log('✅ SUCCESS! Shiprocket authentication working\n');
      console.log('Token (first 50 chars):', response.data.token.substring(0, 50) + '...');
      console.log('Is Authenticated:', response.data.is_authenticated);
      console.log('\n🎉 Your Shiprocket integration is READY!\n');
      return true;
    }
  } catch (error) {
    console.log('❌ FAILED! Shiprocket authentication error\n');
    
    // Check if it's a 403 Forbidden (wrong credentials)
    if (error.response?.status === 403) {
      console.log('⚠️  STATUS: 403 Forbidden');
      console.log('⚠️  This means the Shiprocket account may not be verified');
      console.log('⚠️  OR the credentials are incorrect\n');
      console.log('📋 What to do:');
      console.log('   1. Log in to Shiprocket dashboard');
      console.log('   2. Go to Account → API Keys');
      console.log('   3. Verify your API credentials');
      console.log('   4. Ensure account is verified');
      console.log('   5. Update .env with correct credentials\n');
    }
    
    console.log('Error Details:');
    if (error.response?.data) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
    
    console.log('\n⚠️  Check your credentials in .env file\n');
    return false;
  }
};

testShiprocketAuth();

