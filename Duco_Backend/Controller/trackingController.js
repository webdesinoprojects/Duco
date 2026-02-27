// Controller for Order Tracking and Status Management
const mongoose = require('mongoose');
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

    // ✅ DISABLE CACHING: Force fresh data every time
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

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
    // ✅ Also disable caching for error responses
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
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

// Get orders by user with tracking info - OPTIMIZED for performance
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

    // ✅ OPTIMIZED: Fetch minimal fields + first product only
    // This reduces data transfer and JSON parsing time
    const dbStart = Date.now();
    let orders = [];
    let totalCount = 0;
    
    try {
      // ✅ Get total count first (fast query)
      totalCount = await Order.countDocuments({ user: new mongoose.Types.ObjectId(userId) });
      console.log(`[${new Date().toISOString()}] 📊 Total orders for user: ${totalCount}`);
      
      orders = await Order.aggregate([
        // Stage 1: Match user's orders
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        
        // Stage 2: Sort by newest first
        { $sort: { createdAt: -1 } },
        
        // Stage 3: Limit to 100 orders
        { $limit: 100 },
        
        // Stage 4: Project ONLY essential fields
        {
          $project: {
            _id: 1,
            orderId: 1,
            status: 1,
            createdAt: 1,
            totalAmount: 1,
            totalPay: 1,
            price: 1,
            currency: 1,
            displayPrice: 1,
            orderType: 1,
            paymentStatus: 1,
            paymentmode: 1,
            remainingAmount: 1,
            printroveOrderId: 1,
            hasLogistics: 1,
            trackingUrl: 1,
            // Include designImages for thumbnail (Cloudinary URLs only, small)
            designImages: 1,
            // Include ONLY first product with minimal fields + image data
            products: {
              $cond: {
                if: { $isArray: '$products' },
                then: {
                  $map: {
                    input: { $slice: ['$products', 1] }, // Only first product
                    as: 'product',
                    in: {
                      _id: '$$product._id',
                      name: '$$product.name',
                      products_name: '$$product.products_name',
                      product_name: '$$product.product_name',
                      image: '$$product.image',
                      // Include design.front for thumbnail (Cloudinary URL, small)
                      design: {
                        front: '$$product.design.front'
                      },
                      // Include ONLY first image_url for thumbnail
                      image_url: {
                        $cond: {
                          if: { $isArray: '$$product.image_url' },
                          then: [{ $arrayElemAt: ['$$product.image_url', 0] }],
                          else: '$$product.image_url'
                        }
                      }
                    }
                  }
                },
                else: []
              }
            }
          }
        }
      ]).allowDiskUse(true);
      
      const dbTime = Date.now() - dbStart;
      console.log(`[${new Date().toISOString()}] ✅ DB query took ${dbTime}ms, found ${orders.length} orders`);
      
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
      total: totalCount, // ✅ Total count of all orders
      showing: orders.length, // ✅ Count of orders returned (limited to 100)
      _debug: { totalMs: totalTime, count: orders.length, total: totalCount }
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
