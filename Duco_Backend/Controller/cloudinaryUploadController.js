const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit
    files: 2 // Max 2 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only JPG/JPEG images
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
      cb(null, true);
    } else {
      cb(new Error('Only JPG/JPEG images are allowed'), false);
    }
  }
});

/**
 * Upload delivery slip to Cloudinary
 * Accepts base64 or file upload
 */
const uploadDeliverySlip = async (req, res) => {
  try {
    const { orderId, base64Image } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    let uploadResults = [];

    // Handle base64 upload
    if (base64Image) {
      try {
        const result = await cloudinary.uploader.upload(base64Image, {
          folder: `logistics/delivery-slips/${orderId}`,
          resource_type: 'image',
          format: 'jpg',
          transformation: [
            { width: 1200, height: 1600, crop: 'limit' }, // Limit size
            { quality: 'auto:good' } // Auto quality optimization
          ]
        });

        uploadResults.push({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes
        });
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to Cloudinary',
          error: uploadError.message
        });
      }
    }

    // Handle file upload (from multer)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // Upload buffer to Cloudinary
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: `logistics/delivery-slips/${orderId}`,
                resource_type: 'image',
                format: 'jpg',
                transformation: [
                  { width: 1200, height: 1600, crop: 'limit' },
                  { quality: 'auto:good' }
                ]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });

          uploadResults.push({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            originalName: file.originalname
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: `Failed to upload ${file.originalname}`,
            error: uploadError.message
          });
        }
      }
    }

    if (uploadResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided for upload'
      });
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${uploadResults.length} image(s)`,
      data: uploadResults
    });

  } catch (error) {
    console.error('Upload delivery slip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
      error: error.message
    });
  }
};

/**
 * Delete delivery slip from Cloudinary
 */
const deleteDeliverySlip = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
        result
      });
    }
  } catch (error) {
    console.error('Delete delivery slip error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion',
      error: error.message
    });
  }
};

module.exports = {
  upload, // multer middleware
  uploadDeliverySlip,
  deleteDeliverySlip
};
