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
    let designObj = firstProduct.design;
    
    // ✅ CRITICAL FIX: Handle design as array (from TShirtDesigner - new designs)
    if (Array.isArray(designObj) && designObj.length > 0) {
      console.log('📸 Design is an array, using first element');
      designObj = designObj[0];
    }
    // ✅ If design is already an object (loaded designs), use it directly
    else if (designObj && typeof designObj === 'object' && !Array.isArray(designObj)) {
      console.log('📸 Design is an object (loaded design)');
    }
    
    if (designObj && typeof designObj === 'object') {
      // Extract preview images from design object
      if (designObj.previewImages && typeof designObj.previewImages === 'object') {
        console.log('📸 Found previewImages in design object');
        for (const [key, value] of Object.entries(designObj.previewImages)) {
          if (value && typeof value === 'string' && value.length > 100 && !previewImages[key]) {
            previewImages[key] = value;
            console.log(`  ✅ ${key}: ${value.substring(0, 50)}... (${value.length} chars)`);
          }
        }
      }
      
      // ✅ CRITICAL FIX: Check for direct front/back/left/right as strings (base64 from canvas)
      // This is the most common case for custom designs from TShirtDesigner
      for (const view of ['front', 'back', 'left', 'right']) {
        const viewData = designObj[view];
        
        // Skip if already found
        if (previewImages[view]) continue;
        
        // 1. Check if it's a direct base64 string (MOST COMMON for custom designs)
        if (typeof viewData === 'string' && viewData.length > 100) {
          previewImages[view] = viewData;
          console.log(`  ✅ ${view} (direct string): ${viewData.substring(0, 50)}... (${viewData.length} chars)`);
        }
        // 2. Check if it's an object with uploadedImage (FROM TSHIRTDESIGNER)
        else if (viewData && typeof viewData === 'object' && viewData.uploadedImage && typeof viewData.uploadedImage === 'string' && viewData.uploadedImage.length > 100) {
          previewImages[view] = viewData.uploadedImage;
          console.log(`  ✅ ${view} (from uploadedImage): ${viewData.uploadedImage.substring(0, 50)}... (${viewData.uploadedImage.length} chars)`);
        }
        // 3. Check if it's an object with url
        else if (viewData && typeof viewData === 'object' && viewData.url && typeof viewData.url === 'string' && viewData.url.length > 100) {
          previewImages[view] = viewData.url;
          console.log(`  ✅ ${view} (from url): ${viewData.url.substring(0, 50)}...`);
        }
      }
    }

    // If we found preview images, upload them to Cloudinary
    if (Object.keys(previewImages).length > 0) {
      console.log('📸 Found preview images, uploading to Cloudinary...', {
        count: Object.keys(previewImages).length,
        views: Object.keys(previewImages)
      });
      
      try {
        const uploadedImages = await uploadDesignPreviewImages(previewImages, order._id.toString());
        
        // ✅ CRITICAL: ONLY return if Cloudinary upload succeeded
        if (Object.keys(uploadedImages).length > 0) {
          console.log('✅ Design images uploaded to Cloudinary:', uploadedImages);
          return uploadedImages;
        } else {
          console.error('❌ Cloudinary upload returned empty object - NO IMAGES SAVED');
          return {};
        }
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary upload FAILED - NO IMAGES SAVED:', cloudinaryError.message);
        // ✅ CRITICAL: DO NOT save base64 to database as fallback!
        // Return empty object so order is created without images
        return {};
      }
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
