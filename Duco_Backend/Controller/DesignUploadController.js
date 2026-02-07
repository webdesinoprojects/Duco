// Controller/DesignUploadController.js
const Order = require('../DataBase/Models/OrderModel');
const Invoice = require('../DataBase/Models/InvoiceModule');
const { uploadOrderDesignImages, updateOrderWithDesignImages, updateInvoiceWithDesignImages } = require('../Service/DesignUploadService');

/**
 * Upload design images for an order
 * POST /api/design/upload/:orderId
 */
const uploadDesignForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { designImages } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log(`📦 Processing design upload for order: ${orderId}`);

    // ✅ CRITICAL: Always upload to Cloudinary, never save base64
    let imagesToStore = {};

    // If designImages are provided in request body, upload them to Cloudinary
    if (designImages && Object.keys(designImages).length > 0) {
      console.log('📸 Design images provided in request body, uploading to Cloudinary...');
      
      // Check if they're base64 or already URLs
      const needsUpload = Object.values(designImages).some(img => 
        img && typeof img === 'string' && img.startsWith('data:image/')
      );
      
      if (needsUpload) {
        const { uploadDesignPreviewImages } = require('../utils/cloudinaryUpload');
        imagesToStore = await uploadDesignPreviewImages(designImages, orderId);
        console.log('✅ Uploaded provided images to Cloudinary:', Object.keys(imagesToStore));
      } else {
        // Already URLs, use them
        imagesToStore = designImages;
        console.log('✅ Using provided Cloudinary URLs');
      }
    }
    // Otherwise, extract and upload design images from order products
    else {
      console.log('📸 No images in request body, extracting from order products...');
      imagesToStore = await uploadOrderDesignImages(order, order.products);
    }

    // Update order with design images
    if (Object.keys(imagesToStore).length > 0) {
      await updateOrderWithDesignImages(order, imagesToStore);

      // Also update invoice if it exists
      const invoice = await Invoice.findOne({ order: orderId });
      if (invoice) {
        await updateInvoiceWithDesignImages(invoice, imagesToStore, order.additionalFilesMeta);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Design images uploaded successfully',
      designImages: order.designImages,
      order: {
        _id: order._id,
        orderId: order.orderId,
        designImages: order.designImages
      }
    });
  } catch (error) {
    console.error('❌ Error uploading design:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload design images',
      error: error.message
    });
  }
};

/**
 * Get design images for an order
 * GET /api/design/:orderId
 */
const getDesignForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Fetch order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    return res.status(200).json({
      success: true,
      designImages: order.designImages || {},
      additionalFilesMeta: order.additionalFilesMeta || [],
      order: {
        _id: order._id,
        orderId: order.orderId
      }
    });
  } catch (error) {
    console.error('❌ Error fetching design:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch design images',
      error: error.message
    });
  }
};

module.exports = {
  uploadDesignForOrder,
  getDesignForOrder
};
