const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dpojtbeve',
  api_key: '314328365196326',
  api_secret: 'gP_VFc4aEV6l5uJ9IJQryyD2fU'
});

async function uploadTshirtImages() {
  const images = [
    { file: 'Duco_frontend/public/cloud/front.jpg', publicId: 'tshirt-front' },
    { file: 'Duco_frontend/public/cloud/back.jpg', publicId: 'tshirt-back' },
    { file: 'Duco_frontend/public/cloud/left.jpg', publicId: 'tshirt-left' },
    { file: 'Duco_frontend/public/cloud/right.jpg', publicId: 'tshirt-right' }
  ];

  const uploadedUrls = {};

  for (const image of images) {
    try {
      console.log(`Uploading ${image.file}...`);
      
      const result = await cloudinary.uploader.upload(image.file, {
        public_id: image.publicId,
        folder: 'tshirt-views',
        resource_type: 'image'
      });
      
      uploadedUrls[image.publicId] = result.secure_url;
      console.log(`✅ ${image.publicId}: ${result.secure_url}`);
      
    } catch (error) {
      console.error(`❌ Failed to upload ${image.file}:`, error.message);
    }
  }

  console.log('\n🎯 All T-shirt Image URLs:');
  console.log('Front View:', uploadedUrls['tshirt-front']);
  console.log('Back View:', uploadedUrls['tshirt-back']);
  console.log('Left View:', uploadedUrls['tshirt-left']);
  console.log('Right View:', uploadedUrls['tshirt-right']);
  
  return uploadedUrls;
}

uploadTshirtImages().catch(console.error);