// Controller for Order Tracking and Status Management
const Order = require('../DataBase/Models/OrderModel');
const Logistic = require('../DataBase/Models/LogisticModel');
const PrintroveTrackingService = require('../Service/PrintroveTrackingService');

// Get comprehensive tracking information for an order
const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get comprehensive tracking info
    const trackingInfo = await PrintroveTrackingService.getTrackingInfo(orderId);
    
    // Also get manual logistics entries
    const logistics = await Logistic.find({ orderId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      ...trackingInfo,
      logistics: logistics || []
    });

  } catch (error) {
    console.error('Error getting order tracking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get tracking information' 
    });
  }
};

// Sync order status with Printrove
const syncOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await PrintroveTrackingService.syncOrderStatus(orderId);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Order status synced successfully',
        order: result.order,
        printroveData: result.printroveData
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Error syncing order status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to sync order status' 
    });
  }
};

// Bulk sync all order statuses (Admin only)
const bulkSyncOrderStatuses = async (req, res) => {
  try {
    console.log('🔄 Starting bulk sync of all order statuses...');
    
    const result = await PrintroveTrackingService.syncAllOrderStatuses();
    
    res.json({
      success: true,
      message: `Bulk sync completed: ${result.successful} successful, ${result.failed} failed`,
      ...result
    });

  } catch (error) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to bulk sync order statuses' 
    });
  }
};

// Get Printrove order status directly
const getPrintroveOrderStatus = async (req, res) => {
  try {
    const { printroveOrderId } = req.params;
    
    if (!printroveOrderId) {
      return res.status(400).json({ error: 'Printrove Order ID is required' });
    }

    const printroveData = await PrintroveTrackingService.getOrderStatus(printroveOrderId);
    
    res.json({
      success: true,
      printroveData
    });

  } catch (error) {
    console.error('Error getting Printrove order status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get Printrove order status' 
    });
  }
};

// Get orders by user with tracking info
const getUserOrdersWithTracking = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone')
      .lean();

    // Add tracking status for each order
    const ordersWithTracking = orders.map(order => ({
      ...order,
      canTrack: !!order.printroveTrackingUrl || !!order.printroveOrderId,
      trackingUrl: order.printroveTrackingUrl,
      hasLogistics: false // Will be updated if logistics exist
    }));

    // Check which orders have logistics entries
    const orderIds = orders.map(o => o._id);
    const logisticsCounts = await Logistic.aggregate([
      { $match: { orderId: { $in: orderIds } } },
      { $group: { _id: '$orderId', count: { $sum: 1 } } }
    ]);

    // Update hasLogistics flag
    const logisticsMap = {};
    logisticsCounts.forEach(item => {
      logisticsMap[item._id.toString()] = item.count > 0;
    });

    ordersWithTracking.forEach(order => {
      order.hasLogistics = logisticsMap[order._id.toString()] || false;
    });

    res.json({
      success: true,
      orders: ordersWithTracking
    });

  } catch (error) {
    console.error('Error getting user orders with tracking:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to get user orders' 
    });
  }
};

// Update order status manually (Admin only)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note } = req.body;
    
    if (!orderId || !status) {
      return res.status(400).json({ error: 'Order ID and status are required' });
    }

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { 
        status,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create a logistics entry for manual status update
    if (note) {
      await Logistic.create({
        orderId,
        shippingAddress: `${order.address.houseNumber} ${order.address.street}, ${order.address.city}, ${order.address.state} - ${order.address.pincode}`,
        note: `Status updated to ${status}. ${note}`,
        carrier: 'Manual Update'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to update order status' 
    });
  }
};

module.exports = {
  getOrderTracking,
  syncOrderStatus,
  bulkSyncOrderStatuses,
  getPrintroveOrderStatus,
  getUserOrdersWithTracking,
  updateOrderStatus
};