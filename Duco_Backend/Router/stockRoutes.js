const express = require('express');
const router = express.Router();
const { checkStock, getProductStockStatus, bulkCheckStock } = require('../Controller/stockController');

// Check stock for a single item
router.post('/stock/check', checkStock);

// Get stock status for all variants of a product
router.get('/stock/product/:productId', getProductStockStatus);

// Bulk check stock for multiple items (cart validation)
router.post('/stock/bulk-check', bulkCheckStock);

module.exports = router;
