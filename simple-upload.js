const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple function to upload to Cloudinary using unsigned upload
async function uploadImage(filePath, publicId) {
  return new Promise((resolve, reject) => {
    const formData = [];
    const boundary = '----formdata-' + Math.random().toString(36);
    
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    
    // Build form data
    formData.push(`--${boundary}\r\n`);
    formData.push(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
    formData.push(`Content-Type: image/jpeg\r\n\r\n`);
    formData.push(fileBuffer);
    formData.push(`\r\n--${boundary}\r\n`);
    formData.push(`Content-Disposition: form-data; name="upload_preset"\r\n\r\n`);
    formData.push(`ml_default\r\n`);
    formData.push(`--${boundary}\r\n`);
    formData.push(`Content-Disposition: form-data; name="public_id"\r\n\r\n`);
    formData.push(`${publicId}\r\n`);
    formData.push(`--${boundary}--\r\n`);
    
    const body = Buffer.concat(formData.map(part => 
      typeof part === 'string' ? Buffer.from(part) : part
    ));
    
    const options = {
      hostname: 'api.cloudinary.com',
      port: 443,
      path: '/v1_1/dpojtbeve/image/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.secure_url) {
            console.log(`✅ ${publicId}: ${result.secure_url}`);
            resolve(result.secure_url);
          } else {
            console.log(`❌ ${publicId}: ${data}`);
            reject(new Error(data));
          }
        } catch (e) {
          console.log(`❌ ${publicId}: Parse error - ${data}`);
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function uploadAllImages() {
  const images = [
    { file: 'Duco_frontend/public/cloud/front.jpg', id: 'tshirt-front' },
    { file: 'Duco_frontend/public/cloud/back.jpg', id: 'tshirt-back' },
    { file: 'Duco_frontend/public/cloud/left.jpg', id: 'tshirt-left' },
    { file: 'Duco_frontend/public/cloud/right.jpg', id: 'tshirt-right' }
  ];
  
  const urls = {};
  
  for (const image of images) {
    try {
      console.log(`Uploading ${image.file}...`);
      const url = await uploadImage(image.file, image.id);
      urls[image.id] = url;
    } catch (error) {
      console.error(`Failed to upload ${image.file}:`, error.message);
    }
  }
  
  console.log('\n🎯 T-shirt Image URLs:');
  console.log('Front View:', urls['tshirt-front']);
  console.log('Back View:', urls['tshirt-back']);
  console.log('Left View:', urls['tshirt-left']);
  console.log('Right View:', urls['tshirt-right']);
}

uploadAllImages().catch(console.error);