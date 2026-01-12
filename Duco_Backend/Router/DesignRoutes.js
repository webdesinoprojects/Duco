// routes/designRoutes.js
const express = require('express');
const router = express.Router();
const { createDesign, deleteDesign, getDesignsByUser } = require('../Controller/DesignController');
const { uploadDesignForOrder, getDesignForOrder } = require('../Controller/DesignUploadController');

router.post('/designs', createDesign);
router.get('/designs/user/:userId', getDesignsByUser);
router.get('/designs/user/:userId/:productId', getDesignsByUser);
router.delete('/designs/:id', deleteDesign);

// ✅ Design upload endpoints
router.post('/design/upload/:orderId', uploadDesignForOrder);
router.get('/design/:orderId', getDesignForOrder);

module.exports = router;
