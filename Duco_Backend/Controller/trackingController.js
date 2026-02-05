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
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 📨 GET /api/user/:userId/orders called`);
  
  try {
    const { userId } = req.params;
    console.log(`[${new Date().toISOString()}] 👤 User ID: ${userId}`);
    
    if (!userId) {
      console.error(`[${new Date().toISOString()}] ❌ No userId in params`);
      return res.status(400).json({ error: 'User ID is required' });
    }

    // ✅ PERFORMANCE FIX: Exclude base64 images from response
    let orders = [];
    const dbStart = Date.now();
    
    try {
      orders = await Order.find({ user: userId })
        .select('_id status createdAt updatedAt totalPay price paymentmode products items printroveOrderId designImages')
        .limit(100)
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      const dbTime = Date.now() - dbStart;
      console.log(`[${new Date().toISOString()}] ✅ DB query took ${dbTime}ms, found ${orders.length} orders`);
      
      // ✅ CRITICAL: Remove base64 images from products
      orders = orders.map(order => {
        if (order.products && Array.isArray(order.products)) {
          order.products = order.products.map(product => {
            const cleanProduct = { ...product };
            
            // Remove base64 previewImages
            if (cleanProduct.previewImages) {
              const cleanPreviewImages = {};
              for (const [view, imageData] of Object.entries(cleanProduct.previewImages)) {
                if (typeof imageData === 'string' && !imageData.startsWith('data:image')) {
                  cleanPreviewImages[view] = imageData;
                }
              }
              cleanProduct.previewImages = Object.keys(cleanPreviewImages).length > 0 ? cleanPreviewImages : null;
            }
            
            // Remove base64 from design
            if (cleanProduct.design) {
              const cleanDesign = { ...cleanProduct.design };
              ['front', 'back', 'left', 'right'].forEach(side => {
                if (cleanDesign[side] && cleanDesign[side].uploadedImage && 
                    typeof cleanDesign[side].uploadedImage === 'string' && 
                    cleanDesign[side].uploadedImage.startsWith('data:image')) {
                  delete cleanDesign[side].uploadedImage;
                }
              });
              cleanProduct.design = cleanDesign;
            }
            
            return cleanProduct;
          });
        }
        return order;
      });
      
      // ✅ FILTER OUT INVALID ORDERS
      const beforeFilter = orders.length;
      orders = orders.filter(order => {
        const products = order.products || [];
        const hasValidProduct = Array.isArray(products) && 
          products.length > 0 && 
          products[0] && 
          typeof products[0] === 'object' && 
          Object.keys(products[0]).length > 0;
        
        if (!hasValidProduct) {
          console.warn(`⚠️ Filtering out order ${order._id} - invalid products array`);
        }
        
        return hasValidProduct;
      });
      
      if (beforeFilter !== orders.length) {
        console.log(`[${new Date().toISOString()}] ✅ Filtered ${beforeFilter - orders.length} invalid orders, ${orders.length} valid remaining`);
      }
    } catch (dbErr) {
      const dbTime = Date.now() - dbStart;
      console.error(`[${new Date().toISOString()}] ❌ DB error after ${dbTime}ms:`, dbErr.message);
      orders = [];
    }

    const totalTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] 📤 Responding with ${orders.length} orders (${totalTime}ms total)`);
    
    res.status(200).json({
      success: true,
      orders: orders || [],
      _debug: { totalMs: totalTime, count: orders.length }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ❌ Outer error after ${totalTime}ms:`, error.message);
    res.status(200).json({
      success: false,
      orders: [],
      error: error.message
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