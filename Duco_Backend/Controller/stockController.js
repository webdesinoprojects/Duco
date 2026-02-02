const Product = require('../DataBase/Models/ProductsModel');

// Helper to sum quantity from object
function sumQuantity(obj) {
  if (!obj) return 0;
  if (typeof obj === 'number') return obj;
  return Object.values(obj).reduce((acc, q) => acc + (Number(q) || 0), 0);
}

// Check stock for a specific product, color, and size
exports.checkStock = async (req, res) => {
  try {
    const { productId, color, size, quantity } = req.body;

    if (!productId || !color || !size) {
      return res.status(400).json({
        success: false,
        message: 'productId, color, and size are required'
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        inStock: false
      });
    }

    const requestedQty = Number(quantity) || 1;
    let availableStock = 0;
    let stockFound = false;

    // Find the matching color and size
    for (const imageItem of product.image_url) {
      if (imageItem.color === color || imageItem.colorcode === color) {
        for (const contentItem of imageItem.content) {
          if (contentItem.size === size) {
            availableStock = contentItem.minstock || 0;
            stockFound = true;
            break;
          }
        }
        if (stockFound) break;
      }
    }

    if (!stockFound) {
      return res.status(200).json({
        success: true,
        inStock: false,
        availableStock: 0,
        message: 'Size/Color combination not available'
      });
    }

    const inStock = availableStock >= requestedQty;

    return res.status(200).json({
      success: true,
      inStock,
      availableStock,
      requestedQuantity: requestedQty,
      productName: product.products_name,
      color,
      size
    });
  } catch (error) {
    console.error('Error checking stock:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking stock: ' + error.message
    });
  }
};

// Get stock status for all variants of a product
exports.getProductStockStatus = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const stockStatus = [];
    let totalStock = 0;
    let hasOutOfStock = false;

    for (const imageItem of product.image_url) {
      for (const contentItem of imageItem.content) {
        const stock = contentItem.minstock || 0;
        totalStock += stock;
        
        const variant = {
          color: imageItem.color,
          colorCode: imageItem.colorcode,
          size: contentItem.size,
          stock: stock,
          inStock: stock > 0,
          lowStock: stock > 0 && stock <= 5
        };

        if (!variant.inStock) hasOutOfStock = true;
        stockStatus.push(variant);
      }
    }

    return res.status(200).json({
      success: true,
      productName: product.products_name,
      totalStock,
      hasOutOfStock,
      variants: stockStatus
    });
  } catch (error) {
    console.error('Error getting product stock status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting stock status: ' + error.message
    });
  }
};

// Bulk check stock for multiple items (for cart validation)
exports.bulkCheckStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'items array is required'
      });
    }

    const results = [];
    const outOfStockItems = [];

    for (const item of items) {
      const productId = item.productId || item.product || item._id;
      const color = item.color;
      const size = item.size;
      const quantity = sumQuantity(item.quantity) || item.qty || 1;

      if (!productId || !color || !size) {
        results.push({
          ...item,
          error: 'Missing required fields',
          inStock: false
        });
        continue;
      }

      const product = await Product.findById(productId);
      if (!product) {
        results.push({
          ...item,
          error: 'Product not found',
          inStock: false
        });
        outOfStockItems.push({
          name: item.name || 'Unknown Product',
          reason: 'Product not found'
        });
        continue;
      }

      let availableStock = 0;
      let stockFound = false;

      for (const imageItem of product.image_url) {
        if (imageItem.color === color || imageItem.colorcode === color) {
          for (const contentItem of imageItem.content) {
            if (contentItem.size === size) {
              availableStock = contentItem.minstock || 0;
              stockFound = true;
              break;
            }
          }
          if (stockFound) break;
        }
      }

      const inStock = stockFound && availableStock >= quantity;

      const result = {
        productId,
        productName: product.products_name,
        color,
        size,
        requestedQuantity: quantity,
        availableStock: stockFound ? availableStock : 0,
        inStock,
        stockFound
      };

      results.push(result);

      if (!inStock) {
        outOfStockItems.push({
          name: product.products_name,
          color,
          size,
          requested: quantity,
          available: availableStock,
          reason: stockFound ? 'Insufficient stock' : 'Size/Color combination not available'
        });
      }
    }

    return res.status(200).json({
      success: true,
      allInStock: outOfStockItems.length === 0,
      results,
      outOfStockItems
    });
  } catch (error) {
    console.error('Error in bulk stock check:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking stock: ' + error.message
    });
  }
};
