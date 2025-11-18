// Quick test to verify Cloudinary configuration
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('🔍 Testing Cloudinary Configuration...\n');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('📋 Configuration:');
console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ Missing');
console.log('  API Key:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');

// Test connection
cloudinary.api.ping()
  .then(result => {
    console.log('\n✅ Cloudinary connection successful!');
    console.log('   Status:', result.status);
    console.log('\n🎉 Ready to upload delivery slips!');
  })
  .catch(error => {
    console.error('\n❌ Cloudinary connection failed:');
    console.error('   Error:', error.message);
    console.log('\n💡 Check your credentials in .env file');
  });
