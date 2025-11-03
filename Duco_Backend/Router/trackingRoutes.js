// Routes for Order Tracking and Status Management
const express = require('express');
const router = express.Router();
const {
  getOrderTracking,
  syncOrderStatus,
  bulkSyncOrderStatuses,
  getPrintroveOrderStatus,
  getUserOrdersWithTracking,
  updateOrderStatus
} = require('../Controller/trackingController');

// Get comprehensive tracking information for an order
router.get('/tracking/:orderId', getOrderTracking);

// Sync order status with Printrove
router.post('/tracking/:orderId/sync', syncOrderStatus);

// Get Printrove order status directly
router.get('/printrove/:printroveOrderId', getPrintroveOrderStatus);

// Get user orders with tracking info
router.get('/user/:userId/orders', getUserOrdersWithTracking);

// Get all orders (Admin only)
router.get('/admin/orders', async (req, res) => {
  try {
    const Order = require('../DataBase/Models/OrderModel');
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone')
      .lean();
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
});

// Admin routes
router.post('/admin/sync-all', bulkSyncOrderStatuses);
router.patch('/admin/order/:orderId/status', updateOrderStatus);

module.exports = router;