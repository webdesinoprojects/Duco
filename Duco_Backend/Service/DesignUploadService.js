// Service/DesignUploadService.js
const { uploadDesignPreviewImages } = require('../Utils/cloudinaryUpload');

/**
 * Extract design images from order products and upload to Cloudinary
 * @param {object} order - Order document
 * @param {array} products - Products array from order
 * @returns {Promise<object>} - Uploaded design images URLs
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

    // Extract preview images from product design
    if (firstProduct.design && typeof firstProduct.design === 'object') {
      const design = firstProduct.design;
      
      // Extract preview images from design object
      if (design.previewImages && typeof design.previewImages === 'object') {
        Object.assign(previewImages, design.previewImages);
      }
      
      // Also check for direct front/back/left/right views
      if (design.front?.uploadedImage) previewImages.front = design.front.uploadedImage;
      if (design.back?.uploadedImage) previewImages.back = design.back.uploadedImage;
      if (design.left?.uploadedImage) previewImages.left = design.left.uploadedImage;
      if (design.right?.uploadedImage) previewImages.right = design.right.uploadedImage;
    }

    // If we found preview images, upload them to Cloudinary
    if (Object.keys(previewImages).length > 0) {
      console.log('📸 Found preview images, uploading to Cloudinary...');
      const uploadedImages = await uploadDesignPreviewImages(previewImages, order._id.toString());
      console.log('✅ Design images uploaded:', uploadedImages);
      return uploadedImages;
    }

    console.log('⚠️ No preview images found in product design');
    return {};
  } catch (error) {
    console.error('❌ Error uploading design images:', error.message);
    return {};
  }
};

/**
 * Update order with uploaded design images
 * @param {object} order - Order document
 * @param {object} designImages - Uploaded design image URLs
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

    // Update order with design images
    order.designImages = designImages;
    await order.save();
    
    console.log('✅ Order updated with design images');
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
