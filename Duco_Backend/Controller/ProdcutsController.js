const Product = require('../DataBase/Models/ProductsModel');
const mongoose = require('mongoose');

// ✅ CREATE PRODUCT
const CreateProdcuts = async (req, res) => {
  try {
    const {
      products_name,
      image_url,
      pricing,
      Desciptions,
      subcategory,
      gender = 'Male', // Default to Male if not provided
      printroveProductId,
      printroveVariantId,
      isCorporate = false, // ✅ New field for B2B/B2C
    } = req.body;

    if (
      !products_name ||
      !image_url ||
      !pricing ||
      !Desciptions ||
      !subcategory
    ) {
      return res
        .status(400)
        .send({ message: 'All required fields must be provided' });
    }

    const product = new Product({
      products_name,
      image_url,
      pricing,
      Desciptions,
      subcategory,
      gender,
      printroveProductId,
      printroveVariantId,
      isCorporate: Boolean(isCorporate), // ✅ Ensure boolean
    });

    const savedProduct = await product.save();

    return res.status(201).send({
      message: '✅ Product created successfully',
      product: savedProduct,
    });
  } catch (error) {
    console.error(`❌ Error creating product: ${error.message}`);
    return res
      .status(500)
      .send({ message: 'Server error while creating product' });
  }
};

// ✅ GET ALL PRODUCTS
const GetProducts = async (req, res) => {
  try {
    // ✅ PERFORMANCE FIX: Exclude base64 images from response
    const data = await Product.find()
      .select('-design.previewImages -design.front.uploadedImage -design.back.uploadedImage -design.left.uploadedImage -design.right.uploadedImage')
      .lean();
    
    // ✅ Additional cleanup: Remove any remaining base64 from design objects
    const cleanedData = data.map(product => {
      if (product.design) {
        const cleanDesign = { ...product.design };
        // Remove base64 from each side
        ['front', 'back', 'left', 'right'].forEach(side => {
          if (cleanDesign[side] && cleanDesign[side].uploadedImage && 
              typeof cleanDesign[side].uploadedImage === 'string' && 
              cleanDesign[side].uploadedImage.startsWith('data:image')) {
            delete cleanDesign[side].uploadedImage;
          }
        });
        product.design = cleanDesign;
      }
      return product;
    });
    
    res.status(200).json(cleanedData);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ GET SINGLE PRODUCT (fixed to include Printrove IDs and handle custom T-shirt IDs)
const GetProductssingle = async (req, res) => {
  const { prodcutsid } = req.params;
  try {
    // ✅ Check if this is a custom T-shirt ID (not a MongoDB ObjectId)
    if (prodcutsid && prodcutsid.startsWith('custom-tshirt-')) {
      console.log(`⚠️ Skipping product fetch for custom T-shirt ID: ${prodcutsid}`);
      return res.status(404).json({ 
        message: 'Custom T-shirt designs do not have product data',
        isCustomTshirt: true 
      });
    }

    // ✅ Validate if the ID is a valid MongoDB ObjectId format (24 hex chars)
    if (!prodcutsid || !/^[0-9a-fA-F]{24}$/.test(prodcutsid)) {
      console.log(`⚠️ Invalid product ID format: ${prodcutsid}`);
      return res.status(400).json({ 
        message: 'Invalid product ID format',
        receivedId: prodcutsid 
      });
    }

    // Explicitly select the fields we need
    const data = await Product.findById(prodcutsid).select(
      'products_name image_url pricing Desciptions subcategory gender printroveProductId printroveVariantId isCorporate'
    );

    if (!data) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ DELETE PRODUCT
const deleteProduct = async (req, res) => {
  const productId = req.params.productId || req.params.prodcutsid;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid product id' });
  }

  try {
    const deleted = await Product.findByIdAndDelete(productId);
    if (!deleted) {
      return res.status(404).json({ message: 'Product not found' });
    }

    return res.status(200).json({
      message: '🗑️ Product deleted successfully',
      product: deleted,
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ GET PRODUCTS BY SUBCATEGORY
const GetProductsSubcategory = async (req, res) => {
  const { idsub } = req.params;

  try {
    const data = await Product.find({ subcategory: idsub });
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// ✅ UPDATE PRODUCT
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const updates = req.body;

    // Optional: Validate ObjectId
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // ✅ Ensure isCorporate is boolean (important for safety)
    if (updates.hasOwnProperty('isCorporate')) {
      updates.isCorporate = Boolean(updates.isCorporate);
    }

    // Optional: Recalculate Stock if image_url/content is provided
    if (updates.image_url) {
      let total = 0;
      updates.image_url.forEach((img) => {
        if (Array.isArray(img.content)) {
          img.content.forEach((item) => {
            total += item.minstock || 0;
          });
        }
      });
      updates.Stock = total;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({
      message: '✅ Product updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  CreateProdcuts,
  GetProducts,
  GetProductssingle,
  GetProductsSubcategory,
  updateProduct,
  deleteProduct,
};
