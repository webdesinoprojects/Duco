// Utils/orderPostProcessor.js
const Invoice = require('../DataBase/Models/InvoiceModule');
const { uploadOrderDesignImages, updateOrderWithDesignImages, updateInvoiceWithDesignImages } = require('../Service/DesignUploadService');

/**
 * Post-process order after creation
 * - Upload design images to Cloudinary
 * - Update order and invoice with design URLs
 * @param {object} order - Created order document
 * @param {array} products - Products array
 * @returns {Promise<object>} - Updated order
 */
const processOrderPostCreation = async (order, products) => {
  try {
    if (!order || !order._id) {
      console.warn('⚠️ Invalid order for post-processing');
      return order;
    }

    console.log(`🔄 Post-processing order: ${order._id}`);

    // Upload design images
    const designImages = await uploadOrderDesignImages(order, products);

    // Update order with design images
    if (Object.keys(designImages).length > 0) {
      await updateOrderWithDesignImages(order, designImages);

      // Also update invoice if it exists
      try {
        const invoice = await Invoice.findOne({ order: order._id });
        if (invoice) {
          const additionalFilesMeta = products[0]?.additionalFilesMeta || [];
          await updateInvoiceWithDesignImages(invoice, designImages, additionalFilesMeta);
          console.log('✅ Invoice updated with design images');
        }
      } catch (invoiceErr) {
        console.warn('⚠️ Could not update invoice:', invoiceErr.message);
      }

      console.log('✅ Order post-processing completed');
    } else {
      console.log('⚠️ No design images to upload');
    }

    return order;
  } catch (error) {
    console.error('❌ Error in order post-processing:', error.message);
    // Don't throw - allow order to be created even if design upload fails
    return order;
  }
};

module.exports = {
  processOrderPostCreation
};
