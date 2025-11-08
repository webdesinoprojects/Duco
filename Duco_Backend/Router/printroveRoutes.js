// routes/printroveRoutes.js
const express = require('express');
const router = express.Router();
const PrintroveIntegrationService = require('../Service/PrintroveIntegrationService');
const PrintroveMapping = require('../DataBase/Models/PrintroveMappingModel');
const Product = require('../DataBase/Models/ProductsModel');

// Get Printrove mapping for a product
router.get('/mappings/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const mapping = await PrintroveIntegrationService.getProductMapping(productId);
    
    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: 'No Printrove mapping found for this product'
      });
    }

    res.json({
      success: true,
      mapping: mapping
    });
  } catch (error) {
    console.error('Error fetching Printrove mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Printrove mapping',
      error: error.message
    });
  }
});

// Create Printrove mapping for a product
router.post('/mappings', async (req, res) => {
  try {
    const { ducoProductId, printroveProductId, variants } = req.body;

    if (!ducoProductId || !printroveProductId) {
      return res.status(400).json({
        success: false,
        message: 'ducoProductId and printroveProductId are required'
      });
    }

    const mapping = await PrintroveIntegrationService.createProductMapping(
      ducoProductId,
      printroveProductId,
      variants
    );

    res.json({
      success: true,
      message: 'Printrove mapping created successfully',
      mapping: mapping
    });
  } catch (error) {
    console.error('Error creating Printrove mapping:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Printrove mapping',
      error: error.message
    });
  }
});

// Get variant ID for specific size/color
router.get('/variant/:productId/:size', async (req, res) => {
  try {
    const { productId, size } = req.params;
    const { color } = req.query;

    const variantId = await PrintroveIntegrationService.getVariantId(productId, size, color);

    if (!variantId) {
      return res.status(404).json({
        success: false,
        message: 'No variant ID found for the specified size/color'
      });
    }

    res.json({
      success: true,
      variantId: variantId
    });
  } catch (error) {
    console.error('Error fetching variant ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variant ID',
      error: error.message
    });
  }
});

// Get all variant mappings for a product
router.get('/variants/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const variantMappings = await PrintroveIntegrationService.getVariantMappings(productId);

    res.json({
      success: true,
      variantMappings: variantMappings
    });
  } catch (error) {
    console.error('Error fetching variant mappings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch variant mappings',
      error: error.message
    });
  }
});

// Sync all products with Printrove
router.post('/sync', async (req, res) => {
  try {
    const results = await PrintroveIntegrationService.syncAllProducts();

    res.json({
      success: true,
      message: 'Printrove sync completed',
      results: results
    });
  } catch (error) {
    console.error('Error syncing with Printrove:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync with Printrove',
      error: error.message
    });
  }
});

// Get all Printrove products (for admin dropdown)
router.get('/products', async (req, res) => {
  try {
    const { listPrintroveProducts } = require('../Controller/printroveHelper');
    
    console.log('📦 Fetching Printrove products...');
    const productsData = await listPrintroveProducts();
    console.log('📦 Products data received:', productsData);

    res.json({
      success: true,
      products: productsData?.products || [],
      total: productsData?.products?.length || 0
    });
  } catch (error) {
    console.error('❌ Error fetching Printrove products:', error.message);
    
    // Return empty array instead of error to prevent frontend crashes
    res.json({
      success: false,
      products: [],
      total: 0,
      message: 'Printrove API temporarily unavailable. Please try again later.',
      error: error.message
    });
  }
});

// Get Printrove categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await PrintroveIntegrationService.getCategories();

    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching Printrove categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Printrove categories',
      error: error.message
    });
  }
});

// Get products in a category
router.get('/categories/:categoryId/products', async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const products = await PrintroveIntegrationService.getCategoryProducts(categoryId);

    res.json({
      success: true,
      products: products
    });
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category products',
      error: error.message
    });
  }
});

// Get product variants
router.get('/categories/:categoryId/products/:productId/variants', async (req, res) => {
  try {
    const { categoryId, productId } = req.params;
    
    const variants = await PrintroveIntegrationService.getProductVariants(categoryId, productId);

    res.json({
      success: true,
      variants: variants
    });
  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product variants',
      error: error.message
    });
  }
});

// Upload design to Printrove
router.post('/designs', async (req, res) => {
  try {
    const { designImage, designName } = req.body;

    if (!designImage || !designName) {
      return res.status(400).json({
        success: false,
        message: 'designImage and designName are required'
      });
    }

    const design = await PrintroveIntegrationService.uploadDesign(designImage, designName);

    res.json({
      success: true,
      message: 'Design uploaded successfully',
      design: design
    });
  } catch (error) {
    console.error('Error uploading design:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload design',
      error: error.message
    });
  }
});

module.exports = router;