// Utils/cloudinaryUpload.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param {string} fileName - Name for the uploaded file
 * @param {string} folder - Cloudinary folder path (e.g., 'duco/designs')
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadBase64ToCloudinary = async (base64Data, fileName, folder = 'duco/designs') => {
  try {
    if (!base64Data) {
      console.warn('⚠️ No base64 data provided for upload');
      return null;
    }

    // Remove data URL prefix if present
    let dataToUpload = base64Data;
    if (base64Data.includes(',')) {
      dataToUpload = base64Data.split(',')[1];
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${dataToUpload}`,
      {
        folder: folder,
        public_id: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        resource_type: 'auto',
        overwrite: false,
        quality: 'auto',
        fetch_format: 'auto',
      }
    );

    console.log(`✅ Uploaded to Cloudinary: ${result.public_id}`);
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error.message);
    throw error;
  }
};

/**
 * Upload design preview images (front, back, left, right)
 * @param {object} previewImages - Object with {front, back, left, right} base64 images
 * @param {string} orderId - Order ID for folder organization
 * @returns {Promise<object>} - Object with URLs for each view
 */
const uploadDesignPreviewImages = async (previewImages, orderId) => {
  try {
    if (!previewImages || typeof previewImages !== 'object') {
      console.warn('⚠️ No preview images provided');
      return {};
    }

    const uploadedImages = {};
    const folder = `duco/orders/${orderId}/designs`;

    // Upload each view
    for (const [view, imageData] of Object.entries(previewImages)) {
      if (imageData && typeof imageData === 'string') {
        try {
          const result = await uploadBase64ToCloudinary(
            imageData,
            `${view}_view`,
            folder
          );
          if (result) {
            uploadedImages[view] = result.url;
            console.log(`✅ Uploaded ${view} view: ${result.url}`);
          }
        } catch (err) {
          console.error(`❌ Failed to upload ${view} view:`, err.message);
          uploadedImages[view] = null;
        }
      }
    }

    return uploadedImages;
  } catch (error) {
    console.error('❌ Error uploading design preview images:', error.message);
    return {};
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<boolean>}
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return false;

    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Deleted from Cloudinary: ${publicId}`);
    return result.result === 'ok';
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error.message);
    return false;
  }
};

module.exports = {
  uploadBase64ToCloudinary,
  uploadDesignPreviewImages,
  deleteFromCloudinary,
};
