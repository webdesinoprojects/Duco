// Service for Printrove Order Tracking and Status Updates
const axios = require('axios');
const Order = require('../DataBase/Models/OrderModel');
const { getPrintroveToken } = require('../Controller/printroveAuth');
const { fetchAndUpdateAwbCode } = require('../Services/shiprocketService');

class PrintroveTrackingService {
  constructor() {
    this.baseURL = 'https://api.printrove.com/api/external';
    this.token = null;
  }

  async getToken() {
    if (!this.token) {
      this.token = await getPrintroveToken();
    }
    return this.token;
  }

  async makeRequest(method, endpoint, data = null) {
    const token = await this.getToken();
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Printrove Tracking API Error (${method} ${endpoint}):`, error.response?.data || error.message);
      throw error;
    }
  }

  // Get order status from Printrove
  async getOrderStatus(printroveOrderId) {
    try {
      console.log(`🔍 Fetching Printrove order status for: ${printroveOrderId}`);
      const response = await this.makeRequest('GET', `/orders/${printroveOrderId}`);
      
      console.log(`✅ Printrove order status received:`, {
        orderId: printroveOrderId,
        status: response.order?.status,
        trackingUrl: response.order?.tracking_url,
        estimatedDelivery: response.order?.estimated_delivery_date,
        actualDelivery: response.order?.delivered_date,
        shippedDate: response.order?.shipped_date,
        dispatchDate: response.order?.dispatch_date
      });

      return response;
    } catch (error) {
      console.error(`❌ Error fetching Printrove order status for ${printroveOrderId}:`, error.message);
      throw error;
    }
  }

  // Get all orders from Printrove (for bulk sync)
  async getAllOrders(page = 1, limit = 50) {
    try {
      const response = await this.makeRequest('GET', `/orders?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching all Printrove orders:', error.message);
      throw error;
    }
  }

  // Update local order with Printrove data
  async updateOrderWithPrintroveData(orderId, printroveData) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Update order with Printrove data
      const updates = {
        printroveStatus: printroveData.order?.status || printroveData.status || order.printroveStatus,
        printroveItems: printroveData.order?.order_products || printroveData.items || order.printroveItems,
        printroveTrackingUrl: printroveData.order?.tracking_url || printroveData.tracking_url || order.printroveTrackingUrl,
        updatedAt: new Date()
      };

      // ✅ Update delivery dates with Printrove's actual data
      if (printroveData.order?.estimated_delivery_date) {
        updates.deliveryExpectedDate = new Date(printroveData.order.estimated_delivery_date);
        updates.printroveEstimatedDelivery = new Date(printroveData.order.estimated_delivery_date);
        console.log(`📅 Updated delivery estimate from Printrove: ${updates.deliveryExpectedDate}`);
      }

      // Extract dates from timeline if direct fields aren't available
      if (printroveData.order?.timeline) {
        const timeline = printroveData.order.timeline;
        
        // Find received date (order placed)
        const receivedEvent = timeline.find(t => t.status?.includes('Order placed') || t.status?.includes('Order Received'));
        if (receivedEvent && !updates.printroveReceivedDate) {
          updates.printroveReceivedDate = new Date(receivedEvent.created_at);
        }

        // Find shipped date
        const shippedEvent = timeline.find(t => t.status?.includes('shipped') || t.status?.includes('Order has been shipped'));
        if (shippedEvent && !updates.printroveShippedDate) {
          updates.printroveShippedDate = new Date(shippedEvent.created_at);
          console.log(`📦 Found shipping date from timeline: ${updates.printroveShippedDate}`);
        }

        // Find dispatch/packed date
        const packedEvent = timeline.find(t => t.status?.includes('packed') || t.status?.includes('ready to be dispatched'));
        if (packedEvent && !updates.printroveDispatchDate) {
          updates.printroveDispatchDate = new Date(packedEvent.created_at);
        }
      }

      // Fallback to direct fields if available
      if (printroveData.order?.received_date) {
        updates.printroveReceivedDate = new Date(printroveData.order.received_date);
      }

      if (printroveData.order?.dispatch_date) {
        updates.printroveDispatchDate = new Date(printroveData.order.dispatch_date);
      }

      if (printroveData.order?.shipped_date) {
        updates.printroveShippedDate = new Date(printroveData.order.shipped_date);
      }

      if (printroveData.order?.delivered_date) {
        updates.printroveDeliveredDate = new Date(printroveData.order.delivered_date);
      }

      // ✅ For shipped orders without delivery estimate, calculate based on shipping date
      if (!updates.printroveEstimatedDelivery && updates.printroveShippedDate && printroveData.order?.status === 'Shipped') {
        // Standard delivery: 3-5 days from shipping date
        const shippedDate = updates.printroveShippedDate;
        const estimatedDelivery = new Date(shippedDate.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 days from shipping
        updates.deliveryExpectedDate = estimatedDelivery;
        updates.printroveEstimatedDelivery = estimatedDelivery;
        console.log(`📦 Calculated delivery estimate from shipping date: ${estimatedDelivery}`);
      }

      // Map Printrove status to local status
      if (updates.printroveStatus) {
        updates.status = this.mapPrintroveStatusToLocal(updates.printroveStatus);
      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, updates, { new: true });
      
      console.log(`✅ Updated order ${orderId} with Printrove data:`, {
        status: updates.status,
        printroveStatus: updates.printroveStatus,
        trackingUrl: updates.printroveTrackingUrl,
        estimatedDelivery: updates.deliveryExpectedDate
      });

      return updatedOrder;
    } catch (error) {
      console.error(`Error updating order ${orderId} with Printrove data:`, error.message);
      throw error;
    }
  }

  // Map Printrove status to local order status
  mapPrintroveStatusToLocal(printroveStatus) {
    const statusMap = {
      'pending': 'Pending',
      'processing': 'Processing',
      'received': 'Processing',
      'dispatched': 'Shipped',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'error': 'Pending',
      'success': 'Processing'
    };

    return statusMap[printroveStatus?.toLowerCase()] || 'Processing';
  }

  // Sync single order status
  async syncOrderStatus(orderId) {
    try {
      const order = await Order.findById(orderId);
      if (!order || !order.printroveOrderId) {
        throw new Error(`Order ${orderId} not found or no Printrove order ID`);
      }

      const printroveData = await this.getOrderStatus(order.printroveOrderId);
      const updatedOrder = await this.updateOrderWithPrintroveData(orderId, printroveData);

      return {
        success: true,
        order: updatedOrder,
        printroveData: printroveData
      };
    } catch (error) {
      console.error(`Error syncing order status for ${orderId}:`, error.message);
      return {
        success: false,
        error: error.message,
        orderId: orderId
      };
    }
  }

  // Bulk sync all orders with Printrove order IDs
  async syncAllOrderStatuses() {
    try {
      console.log('🔄 Starting bulk sync of all order statuses...');
      
      const orders = await Order.find({ 
        printroveOrderId: { $exists: true, $ne: null, $ne: '' },
        status: { $nin: ['Delivered', 'Cancelled'] } // Only sync active orders
      });

      console.log(`📦 Found ${orders.length} orders to sync`);

      const results = [];
      const batchSize = 5; // Process in batches to avoid rate limiting

      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const batchPromises = batch.map(order => this.syncOrderStatus(order._id));
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const order = batch[index];
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Unknown error',
              orderId: order._id
            });
          }
        });

        // Small delay between batches
        if (i + batchSize < orders.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`✅ Bulk sync completed: ${successful} successful, ${failed} failed`);

      return {
        total: orders.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      console.error('Error in bulk sync:', error.message);
      throw error;
    }
  }

  // Get comprehensive tracking info for an order
  async getTrackingInfo(orderId) {
    try {
      // ✅ FORCE FRESH DATA: Explicitly request latest from DB (no cache)
      const order = await Order.findById(orderId, {
        // Include ALL payment-related fields
        _id: 1,
        orderId: 1,
        user: 1,
        products: 1,
        price: 1,
        totalAmount: 1,
        totalPay: 1,
        remainingAmount: 1,
        paymentStatus: 1,
        paymentmode: 1,
        advancePaidAmount: 1,
        status: 1,
        addresses: 1,
        address: 1,
        printroveOrderId: 1,
        printroveStatus: 1,
        printroveTrackingUrl: 1,
        printroveEstimatedDelivery: 1,
        deliveryExpectedDate: 1,
        shiprocket: 1,
        designImages: 1,
        createdAt: 1,
        // ... all other fields you need
      })
        .populate('user') // ✅ Populate ALL user fields including address array
        .lean(); // Use lean() for better performance
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // ✅ Just-in-Time Shiprocket sync: if shipment_id exists but awb is missing, fetch from Shiprocket and update DB
      const shipmentId = order.shiprocket?.shipmentId;
      const hasAwb = !!order.shiprocket?.awbCode;
      if (shipmentId && !hasAwb) {
        try {
          const result = await fetchAndUpdateAwbCode(shipmentId);
          if (result.success && result.hasAwb) {
            await Order.findByIdAndUpdate(orderId, {
              $set: {
                'shiprocket.awbCode': result.awbCode,
                'shiprocket.courierName': result.courierName || order.shiprocket?.courierName,
                'shiprocket.status': result.status || order.shiprocket?.status,
                'shiprocket.lastUpdated': new Date(),
              },
            });
            order.shiprocket = order.shiprocket || {};
            order.shiprocket.awbCode = result.awbCode;
            order.shiprocket.courierName = result.courierName || order.shiprocket.courierName;
            order.shiprocket.status = result.status || order.shiprocket.status;
          }
        } catch (err) {
          // Non-blocking: don't fail the request if Shiprocket fetch fails
        }
      }

      // ✅ FIX: Find matching phone from user's saved addresses
      if (order.user && order.user.address && Array.isArray(order.user.address)) {
        const shippingAddr = order.addresses?.shipping || order.address;
        if (shippingAddr) {
          // Find matching address in user's saved addresses
          const matchingAddress = order.user.address.find(addr => 
            addr.fullName === shippingAddr.fullName &&
            addr.city === shippingAddr.city &&
            addr.pincode === shippingAddr.pincode
          );
          
          // If found, inject mobileNumber into order addresses
          if (matchingAddress && matchingAddress.mobileNumber) {
            if (order.addresses?.shipping) {
              order.addresses.shipping.mobileNumber = matchingAddress.mobileNumber;
            }
            if (order.address) {
              order.address.mobileNumber = matchingAddress.mobileNumber;
            }
          }
        }
      }

      // ✅ CRITICAL: Remove base64 images from products to prevent slow loading
      if (order.products && Array.isArray(order.products)) {
        order.products = order.products.map(product => {
          // Create a clean copy without base64 data
          const cleanProduct = { ...product };
          
          // Remove base64 previewImages (keep only if they're CDN URLs)
          if (cleanProduct.previewImages) {
            const cleanPreviewImages = {};
            for (const [view, imageData] of Object.entries(cleanProduct.previewImages)) {
              // Only keep if it's a URL (not base64)
              if (typeof imageData === 'string' && !imageData.startsWith('data:image')) {
                cleanPreviewImages[view] = imageData;
              }
            }
            cleanProduct.previewImages = Object.keys(cleanPreviewImages).length > 0 ? cleanPreviewImages : null;
          }
          
          // Remove base64 from design object
          if (cleanProduct.design) {
            const cleanDesign = { ...cleanProduct.design };
            
            // Remove base64 from design.previewImages
            if (cleanDesign.previewImages) {
              const cleanDesignPreviewImages = {};
              for (const [view, imageData] of Object.entries(cleanDesign.previewImages)) {
                if (typeof imageData === 'string' && !imageData.startsWith('data:image')) {
                  cleanDesignPreviewImages[view] = imageData;
                }
              }
              cleanDesign.previewImages = Object.keys(cleanDesignPreviewImages).length > 0 ? cleanDesignPreviewImages : null;
            }
            
            // Remove base64 from design.front/back/left/right.uploadedImage
            ['front', 'back', 'left', 'right'].forEach(side => {
              if (cleanDesign[side] && cleanDesign[side].uploadedImage) {
                if (typeof cleanDesign[side].uploadedImage === 'string' && cleanDesign[side].uploadedImage.startsWith('data:image')) {
                  delete cleanDesign[side].uploadedImage;
                }
              }
            });
            
            cleanProduct.design = cleanDesign;
          }
          
          return cleanProduct;
        });
      }

      // ✅ Also clean designImages at order level if they contain base64
      if (order.designImages) {
        const cleanDesignImages = {};
        for (const [view, imageData] of Object.entries(order.designImages)) {
          if (typeof imageData === 'string' && !imageData.startsWith('data:image')) {
            cleanDesignImages[view] = imageData;
          }
        }
        order.designImages = Object.keys(cleanDesignImages).length > 0 ? cleanDesignImages : null;
      }

      let printroveData = null;
      let trackingError = null;

      // ✅ PERFORMANCE FIX: Don't auto-sync on every page load
      // Only use stored Printrove data, let user manually sync if needed
      if (order.printroveOrderId) {
        console.log(`📦 Order has Printrove ID: ${order.printroveOrderId} (stored data will be used)`);
        // Use stored Printrove data from order document
        // Manual sync available via separate endpoint
      }

      // Prepare tracking timeline with Printrove data
      const timeline = [];

      // Add order creation
      timeline.push({
        status: 'Order Placed',
        timestamp: order.createdAt,
        description: 'Your order has been successfully placed and payment confirmed.',
        type: 'order',
        isCompleted: true
      });

      // Add Printrove submission if available
      if (order.printroveOrderId) {
        timeline.push({
          status: 'Sent to Production',
          timestamp: order.updatedAt,
          description: `Order sent to Printrove for production. Printrove Order ID: ${order.printroveOrderId}`,
          type: 'production',
          isCompleted: true
        });
      }

      // Add Printrove-specific events - use stored dates from order document
      
      // Add production received event
      const receivedDate = order.printroveReceivedDate;
      if (receivedDate) {
        timeline.push({
          status: 'Production Started',
          timestamp: receivedDate,
          description: 'Your order has been received by the production facility and manufacturing has begun.',
          type: 'production',
          isCompleted: true
        });
      }

      // Add dispatch event
      const dispatchDate = order.printroveDispatchDate;
      if (dispatchDate) {
        timeline.push({
          status: 'Dispatched',
          timestamp: dispatchDate,
          description: 'Your order has been dispatched from the production facility.',
          type: 'status',
          isCompleted: true
        });
      }

      // Add shipped event
      const shippedDate = order.printroveShippedDate;
      if (shippedDate) {
        timeline.push({
          status: 'Shipped',
          timestamp: shippedDate,
          description: 'Your order is now in transit and on its way to you.',
          type: 'status',
          isCompleted: true
        });
      }

      // Add delivered event
      const deliveredDate = order.printroveDeliveredDate;
      if (deliveredDate) {
        timeline.push({
          status: 'Delivered',
          timestamp: deliveredDate,
          description: 'Your order has been successfully delivered!',
          type: 'status',
          isCompleted: true
        });
      }

      // Add current status if not already covered by Printrove events
      const statusDescriptions = {
        'Pending': 'Order is being processed and will be sent to production soon.',
        'Processing': 'Your order is being manufactured and prepared for shipment.',
        'Shipped': 'Your order has been shipped and is on its way to you.',
        'Delivered': 'Your order has been successfully delivered.',
        'Cancelled': 'This order has been cancelled.'
      };

      // Only add current status if we don't have specific Printrove events
      const hasSpecificEvents = printroveData?.order && (
        printroveData.order.received_date || 
        printroveData.order.dispatch_date || 
        printroveData.order.shipped_date || 
        printroveData.order.delivered_date
      );

      if (!hasSpecificEvents) {
        timeline.push({
          status: order.status,
          timestamp: order.updatedAt,
          description: statusDescriptions[order.status] || 'Order status updated.',
          type: 'status',
          isCompleted: ['Processing', 'Shipped', 'Delivered'].includes(order.status)
        });
      }

      // Add delivery estimate - prioritize Printrove's exact estimate
      if (order.status !== 'Delivered' && order.status !== 'Cancelled') {
        let estimatedDate = null;
        let estimatedDescription = '';
        let isPrintroveEstimate = false;
        
        // ✅ Priority 1: Use stored Printrove estimate (most reliable)
        if (order.printroveEstimatedDelivery) {
          estimatedDate = order.printroveEstimatedDelivery;
          
          // Different descriptions based on order status
          if (order.printroveShippedDate) {
            estimatedDescription = 'Delivery estimate calculated from shipping date (3-5 business days from dispatch).';
          } else {
            estimatedDescription = 'Delivery estimate from Printrove based on production and shipping schedule.';
          }
          isPrintroveEstimate = true;
          console.log(`📅 Using stored Printrove delivery estimate: ${estimatedDate}`);
        }
        // ✅ Priority 2: Use fresh Printrove data
        else if (printroveData?.order?.estimated_delivery_date) {
          estimatedDate = new Date(printroveData.order.estimated_delivery_date);
          estimatedDescription = 'Delivery estimate provided by Printrove based on current production status.';
          isPrintroveEstimate = true;
          console.log(`📅 Using fresh Printrove delivery estimate: ${estimatedDate}`);
        }
        // ✅ Priority 3: Calculate from shipping date if available
        else if (order.printroveShippedDate || (printroveData?.order?.status === 'Shipped' && shippedDate)) {
          const shipDate = order.printroveShippedDate || shippedDate;
          estimatedDate = new Date(shipDate.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 days from shipping
          estimatedDescription = 'Estimated delivery based on shipping date (3-5 business days from dispatch).';
          isPrintroveEstimate = true;
          console.log(`📦 Calculated delivery estimate from shipping date: ${estimatedDate}`);
        }
        // ✅ Priority 4: Fallback to generic estimate
        else if (order.deliveryExpectedDate) {
          estimatedDate = order.deliveryExpectedDate;
          estimatedDescription = 'Expected delivery date based on standard processing time.';
        }
        // ✅ Priority 5: Calculate estimate based on order date
        else {
          const orderDate = new Date(order.createdAt);
          estimatedDate = new Date(orderDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days default
          estimatedDescription = 'Estimated delivery date (7-10 business days from order date).';
        }

        if (estimatedDate) {
          timeline.push({
            status: isPrintroveEstimate ? 'Printrove Delivery Estimate' : 'Estimated Delivery',
            timestamp: estimatedDate,
            description: estimatedDescription,
            type: 'estimate',
            isCompleted: false,
            isPrintroveEstimate: isPrintroveEstimate
          });
        }

        // Add external tracking information if available
        if (order.printroveTrackingUrl && printroveData?.order?.courier) {
          timeline.push({
            status: 'External Tracking Available',
            timestamp: order.printroveShippedDate || new Date(),
            description: `Track your shipment with ${printroveData.order.courier.name}. Current status: ${printroveData.order.tracking_status || 'In Transit'}`,
            type: 'tracking',
            isCompleted: true,
            trackingUrl: order.printroveTrackingUrl,
            courierName: printroveData.order.courier.name,
            trackingStatus: printroveData.order.tracking_status
          });
        }
      }

      return {
        order: order, // Already lean object
        printroveData,
        trackingError,
        timeline: timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        trackingUrl: order.printroveTrackingUrl,
        canTrack: !!order.printroveTrackingUrl || !!order.printroveOrderId
      };

    } catch (error) {
      console.error(`Error getting tracking info for order ${orderId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new PrintroveTrackingService();