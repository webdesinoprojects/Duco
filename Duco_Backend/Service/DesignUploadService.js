// Service/DesignUploadService.js
const { uploadDesignPreviewImages } = require('../utils/cloudinaryUpload');

/**
 * Extract design images from order products and upload to Cloudinary
 * @param {object} order - Order document
 * @param {array} products - Products array from order
 * @returns {Promise<object>} - Uploaded design images URLs or base64 data
 */
const uploadOrderDesignImages = async (order, products) => {
  try {
    if (!order || !order._id) {
      console.warn('⚠️ Invalid order for design upload');
      return {};
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.log('⚠️ No products found for design extraction');
      return {};
    }

    const firstProduct = products[0];
    const previewImages = {};

    console.log('🔍 Extracting design images from product:', {
      hasPreviewImages: !!firstProduct.previewImages,
      hasDesign: !!firstProduct.design,
      previewImagesKeys: firstProduct.previewImages ? Object.keys(firstProduct.previewImages) : [],
      designKeys: firstProduct.design ? Object.keys(firstProduct.design) : [],
    });

    // ✅ CRITICAL: Check for previewImages first (from cart item)
    if (firstProduct.previewImages && typeof firstProduct.previewImages === 'object') {
      console.log('📸 Found previewImages in product (from cart)');
      for (const [key, value] of Object.entries(firstProduct.previewImages)) {
        if (value && typeof value === 'string' && value.length > 100) {
          previewImages[key] = value;
          console.log(`  ✅ ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
        }
      }
    }
    
    // Extract preview images from product design
    if (firstProduct.design && typeof firstProduct.design === 'object') {
      const design = firstProduct.design;
      
      // Extract preview images from design object
      if (design.previewImages && typeof design.previewImages === 'object') {
        console.log('📸 Found previewImages in design object');
        for (const [key, value] of Object.entries(design.previewImages)) {
          if (value && typeof value === 'string' && value.length > 100) {
            previewImages[key] = value;
            console.log(`  ✅ ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
          }
        }
      }
      
      // Also check for direct front/back/left/right views
      if (design.front?.uploadedImage && typeof design.front.uploadedImage === 'string' && design.front.uploadedImage.length > 100) {
        previewImages.front = design.front.uploadedImage;
        console.log(`  ✅ front (from design.front.uploadedImage): ${design.front.uploadedImage.substring(0, 50)}...`);
      }
      if (design.back?.uploadedImage && typeof design.back.uploadedImage === 'string' && design.back.uploadedImage.length > 100) {
        previewImages.back = design.back.uploadedImage;
        console.log(`  ✅ back (from design.back.uploadedImage): ${design.back.uploadedImage.substring(0, 50)}...`);
      }
      if (design.left?.uploadedImage && typeof design.left.uploadedImage === 'string' && design.left.uploadedImage.length > 100) {
        previewImages.left = design.left.uploadedImage;
        console.log(`  ✅ left (from design.left.uploadedImage): ${design.left.uploadedImage.substring(0, 50)}...`);
      }
      if (design.right?.uploadedImage && typeof design.right.uploadedImage === 'string' && design.right.uploadedImage.length > 100) {
        previewImages.right = design.right.uploadedImage;
        console.log(`  ✅ right (from design.right.uploadedImage): ${design.right.uploadedImage.substring(0, 50)}...`);
      }
    }

    // If we found preview images, try to upload them to Cloudinary
    if (Object.keys(previewImages).length > 0) {
      console.log('📸 Found preview images, attempting Cloudinary upload...', {
        count: Object.keys(previewImages).length,
        views: Object.keys(previewImages)
      });
      
      try {
        const uploadedImages = await uploadDesignPreviewImages(previewImages, order._id.toString());
        
        // ✅ If Cloudinary upload succeeded, return those URLs
        if (Object.keys(uploadedImages).length > 0) {
          console.log('✅ Design images uploaded to Cloudinary:', uploadedImages);
          return uploadedImages;
        }
      } catch (cloudinaryError) {
        console.warn('⚠️ Cloudinary upload failed, using base64 data URLs as fallback:', cloudinaryError.message);
      }
      
      // ✅ Fallback: Return base64 data URLs directly
      console.log('📸 Using base64 data URLs as fallback');
      return previewImages;
    }

    console.log('⚠️ No preview images found in product design or previewImages');
    console.log('📋 First product structure:', {
      keys: Object.keys(firstProduct),
      hasPreviewImages: !!firstProduct.previewImages,
      hasDesign: !!firstProduct.design,
      designStructure: firstProduct.design ? {
        keys: Object.keys(firstProduct.design),
        hasFront: !!firstProduct.design.front,
        hasBack: !!firstProduct.design.back,
        hasLeft: !!firstProduct.design.left,
        hasRight: !!firstProduct.design.right,
      } : null
    });
    return {};
  } catch (error) {
    console.error('❌ Error uploading design images:', error.message);
    return {};
  }
};

/**
 * Update order with uploaded design images
 * @param {object} order - Order document
 * @param {object} designImages - Uploaded design image URLs or base64 data
 * @returns {Promise<object>} - Updated order
 */
const updateOrderWithDesignImages = async (order, designImages) => {
  try {
    if (!order || !order._id) {
      console.warn('⚠️ Invalid order for update');
      return order;
    }

    if (!designImages || Object.keys(designImages).length === 0) {
      console.log('⚠️ No design images to update');
      return order;
    }

    // ✅ Store design images directly (can be Cloudinary URLs or base64 data URLs)
    order.designImages = {
      front: designImages.front || null,
      back: designImages.back || null,
      left: designImages.left || null,
      right: designImages.right || null,
    };
    
    await order.save();
    
    console.log('✅ Order updated with design images:', {
      front: !!order.designImages.front,
      back: !!order.designImages.back,
      left: !!order.designImages.left,
      right: !!order.designImages.right,
    });
    return order;
  } catch (error) {
    console.error('❌ Error updating order with design images:', error.message);
    return order;
  }
};

/**
 * Update invoice with design images and additional files
 * @param {object} invoice - Invoice document
 * @param {object} designImages - Design image URLs
 * @param {array} additionalFilesMeta - Additional files metadata
 * @returns {Promise<object>} - Updated invoice
 */
const updateInvoiceWithDesignImages = async (invoice, designImages, additionalFilesMeta) => {
  try {
    if (!invoice || !invoice._id) {
      console.warn('⚠️ Invalid invoice for update');
      return invoice;
    }

    if (designImages && Object.keys(designImages).length > 0) {
      invoice.designImages = designImages;
    }

    if (additionalFilesMeta && Array.isArray(additionalFilesMeta)) {
      invoice.additionalFilesMeta = additionalFilesMeta;
    }

    await invoice.save();
    console.log('✅ Invoice updated with design images');
    return invoice;
  } catch (error) {
    console.error('❌ Error updating invoice with design images:', error.message);
    return invoice;
  }
};

module.exports = {
  uploadOrderDesignImages,
  updateOrderWithDesignImages,
  updateInvoiceWithDesignImages,
};
