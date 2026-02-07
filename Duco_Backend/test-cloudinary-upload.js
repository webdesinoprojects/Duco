// Quick test of Cloudinary upload
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testUpload() {
  try {
    console.log('☁️  Testing Cloudinary upload...\n');
    console.log('Config:');
    console.log(`  Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    console.log(`  API Key: ${process.env.CLOUDINARY_API_KEY?.substring(0, 10)}...`);
    console.log('');

    // Create a small test base64 image (1x1 red pixel)
    const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

    console.log('🔄 Uploading test image...');
    const result = await cloudinary.uploader.upload(testBase64, {
      folder: 'test',
      resource_type: 'auto'
    });

    console.log('✅ Upload successful!');
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Public ID: ${result.public_id}`);
    console.log('');
    console.log('✅ Cloudinary is working correctly!');

  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.error('');
    console.error('Check:');
    console.error('  1. Cloudinary credentials in .env');
    console.error('  2. Internet connection');
    console.error('  3. Cloudinary account is active');
  }
}

testUpload();
