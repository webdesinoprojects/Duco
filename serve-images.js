const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Serve static files from the cloud directory
app.use('/tshirt-images', express.static(path.join(__dirname, 'Duco_frontend/public/cloud')));

app.listen(PORT, () => {
  console.log(`🚀 Image server running on http://localhost:${PORT}`);
  console.log('\n🎯 T-shirt Image URLs:');
  console.log('Front View: http://localhost:3001/tshirt-images/front.jpg');
  console.log('Back View: http://localhost:3001/tshirt-images/back.jpg');
  console.log('Left View: http://localhost:3001/tshirt-images/left.jpg');
  console.log('Right View: http://localhost:3001/tshirt-images/right.jpg');
  console.log('\n📝 Copy these URLs and paste them in your admin panel!');
});