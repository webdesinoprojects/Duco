// Controller/DesignUploadController.js
const Order = require('../DataBase/Models/OrderModel');
const Invoice = require('../DataBase/Models/InvoiceModule');
const { uploadOrderDesignImages, updateOrderWithDesignImages, updateInvoiceWithDesignImages } = require('../Service/DesignUploadService');
// const printComplianceService = require('../Service/PrintComplianceService'); // Removed to fix backend crash

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

    // ✅ STEP 1: Extract design data from order products for print compliance
    let designData = null;
    if (order.products && order.products.length > 0) {
      const firstProduct = order.products[0];
      if (firstProduct.design) {
        designData = {
          front: firstProduct.design.front || null,
          back: firstProduct.design.back || null,
        };
        console.log('📐 Design data extracted for print compliance:', {
          hasFront: !!designData.front,
          hasBack: !!designData.back,
        });
      }
    }

    // ✅ STEP 2: Process design for print compliance (3×3" front, A4 back)
    let printReadyFiles = null;
    if (designData && (designData.front || designData.back)) {
      try {
        console.log('🖨️ Processing design for print compliance...');
        
        // Validate compliance
        const validation = printComplianceService.validatePrintCompliance(designData);
        if (validation.warnings.length > 0) {
          console.warn('⚠️ Design validation warnings:', validation.warnings);
        }
        
        if (validation.isValid) {
          // Process for print (3×3" front, A4 back, 300 DPI, transparent)
          printReadyFiles = await printComplianceService.processDesignForPrint(
            designData,
            orderId
          );
          
          console.log('✅ Print-ready files generated:', {
            front: printReadyFiles.front ? 'Yes' : 'No',
            back: printReadyFiles.back ? 'Yes' : 'No',
          });
        } else {
          console.error('❌ Design validation failed:', validation.errors);
        }
      } catch (error) {
        console.error('❌ Print compliance processing failed:', error.message);
        // Continue with original design as fallback
      }
    }

    // ✅ STEP 3: Upload print-ready files to Cloudinary
    let printReadyUrls = {};
    if (printReadyFiles) {
      try {
        const { uploadDesignPreviewImages } = require('../utils/cloudinaryUpload');
        
        // Upload front if exists
        if (printReadyFiles.front && printReadyFiles.front.path) {
          const fs = require('fs');
          const frontBase64 = `data:image/png;base64,${fs.readFileSync(printReadyFiles.front.path).toString('base64')}`;
          const frontResult = await uploadDesignPreviewImages({ front: frontBase64 }, `${orderId}-print-ready`);
          printReadyUrls.front = frontResult.front;
          console.log('✅ Front print-ready file uploaded to Cloudinary');
        }
        
        // Upload back if exists
        if (printReadyFiles.back && printReadyFiles.back.path) {
          const fs = require('fs');
          const backBase64 = `data:image/png;base64,${fs.readFileSync(printReadyFiles.back.path).toString('base64')}`;
          const backResult = await uploadDesignPreviewImages({ back: backBase64 }, `${orderId}-print-ready`);
          printReadyUrls.back = backResult.back;
          console.log('✅ Back print-ready file uploaded to Cloudinary');
        }
        
        // Cleanup temp files
        printComplianceService.cleanupTempFiles(printReadyFiles);
      } catch (error) {
        console.error('❌ Failed to upload print-ready files:', error.message);
      }
    }

    // ✅ STEP 4: Upload original design images (for preview/display)
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

      // ✅ STEP 5: Store print-ready URLs in order
      if (Object.keys(printReadyUrls).length > 0) {
        order.printReadyFiles = printReadyUrls;
        await order.save();
        console.log('✅ Print-ready URLs saved to order:', printReadyUrls);
      }

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
      printReadyFiles: order.printReadyFiles || {}, // ✅ Include print-ready files
      order: {
        _id: order._id,
        orderId: order.orderId,
        designImages: order.designImages,
        printReadyFiles: order.printReadyFiles, // ✅ Include print-ready files
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
