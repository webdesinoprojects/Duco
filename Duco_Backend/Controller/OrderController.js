const mongoose = require('mongoose');
const Order = require('../DataBase/Models/OrderModel');
const Product = require('../DataBase/Models/ProductsModel');
const Design = require('../DataBase/Models/DesignModel');
const { createShiprocketOrder, fetchAndUpdateAwbCode } = require("../Services/shiprocketService");

// ================================================================
// 🔄 BACKGROUND JOB - Poll for AWB Updates Every Minute
// ================================================================
/**
 * Automatically checks all orders with shipmentId but no awbCode
 * to see if Shiprocket has assigned an AWB code yet
 * Runs every 60 seconds in the background
 */
let awbPollingInterval = null;

const startAwbPolling = () => {
  if (awbPollingInterval) {
    console.log('[AWB Polling] ℹ️ Polling already running, skipping restart');
    return;
  }

  awbPollingInterval = setInterval(async () => {
    try {
      // Find orders with shipmentId but no awbCode
      const ordersNeedingAwb = await Order.find(
        {
          'shiprocket.shipmentId': { $exists: true, $ne: null },
          'shiprocket.awbCode': { $in: [null, '', undefined] }
        },
        '_id orderId shiprocket.shipmentId'
      ).limit(10).lean();

      if (ordersNeedingAwb.length > 0) {
        // ✅ SILENT MODE: Only log when AWB is found, not every poll
        let awbFound = false;

        // Check each order for AWB updates
        for (const order of ordersNeedingAwb) {
          try {
            const result = await fetchAndUpdateAwbCode(order.shiprocket.shipmentId);

            if (result.success && result.hasAwb) {
              console.log(`[AWB Polling] Found AWB: ${result.awbCode} for order ${order.orderId}`);
              // ✅ UPDATE DATABASE with AWB
              try {
                const updateResult = await Order.findByIdAndUpdate(
                  order._id,
                  {
                    $set: {
                      'shiprocket.awbCode': result.awbCode,
                      'shiprocket.courierName': result.courierName,
                      'shiprocket.status': result.status,
                    }
                  },
                  { new: false } // Don't fetch the document again
                );

                if (updateResult) {
                  console.log(`[AWB Polling] ✅ AWB assigned and saved for order ${order.orderId}: ${result.awbCode}`);
                  awbFound = true;
                } else {
                  console.error(`[AWB Polling] ❌ Failed to update order ${order.orderId} - document not found`);
                }
              } catch (dbErr) {
                console.error(`[AWB Polling] ❌ Database error updating order ${order.orderId}:`, dbErr.message);
              }
            } else if (result.success && !result.hasAwb) {
              console.log(`[AWB Polling] No AWB yet for order ${order.orderId} (status: ${result.status})`);
            }
          } catch (err) {
            // Silent fail - don't spam logs
            console.error(`[AWB Polling] Error processing order ${order.orderId}:`, err.message);
          }
        }
        
        // Only log when polling actually finds something
        if (!awbFound && ordersNeedingAwb.length <= 2) {
          // Silent for small batches - likely same orders being polled
        }
      }
    } catch (err) {
      console.error('[AWB Polling] Error in polling job:', err.message);
    }
  }, 300000); // ✅ Run every 5 minutes (5 * 60 * 1000) instead of every 60 seconds

  console.log('[AWB Polling] ✅ Started AWB polling job (runs every 5 minutes)');
};

// Start polling when module loads
if (typeof window === 'undefined') { // Only in Node.js, not in browser
  startAwbPolling();
}


// ================================================================
// 🧩 Helper – Flatten base64 or nested design objects
// ================================================================
function flattenDesign(design = {}) {
  const flatten = (v) =>
    typeof v === 'string'
      ? v
      : typeof v?.uploadedImage === 'string'
      ? v.uploadedImage
      : '';

  return {
    frontView: flatten(design.front),
    backView: flatten(design.back),
    leftView: flatten(design.left),
    rightView: flatten(design.right),
    uploadedLogo: flatten(design.uploadedLogo),
    extraFiles: Array.isArray(design.extraFiles)
      ? design.extraFiles.map((f) =>
          typeof f === 'string' ? { name: f.split('/').pop(), url: f } : f
        )
      : [],
  };
}

// ================================================================
// 🧩 Helper – Enrich Products with Design, Product, and File Data
// ================================================================
async function enrichOrderProducts(products = []) {
  return await Promise.all(
    products.map(async (p) => {
      const item = { ...p };

      // ✅ Fetch product name/image if missing
      if (!item.name && item.product) {
        try {
          const prod = await Product.findById(item.product).lean();
          if (prod) {
            item.name = prod.products_name || prod.name || 'Unnamed Product';
            item.image =
              Array.isArray(prod.image_url) && prod.image_url.length > 0
                ? prod.image_url[0]
                : item.image || '';
          }
        } catch (err) {
          console.error('Error fetching product:', err.message);
        }
      }

      // ✅ Fetch design document if stored as ID
      if (item.design && typeof item.design === 'string') {
        try {
          const designDoc = await Design.findById(item.design).lean();
          if (designDoc?.design) item.design = designDoc.design;
        } catch (err) {
          console.error('Error fetching design:', err.message);
        }
      }

      // ✅ Handle inline design data
      if (item.design_data) item.design = item.design_data;

      // ✅ Normalize design structure (for base64 / nested keys)
      if (item.design && typeof item.design === 'object') {
        item.design = flattenDesign(item.design);
      } else {
        item.design = flattenDesign({});
      }

      // ✅ Normalize extra files (so frontend can show them properly)
      if (item.design?.extraFiles?.length > 0) {
        item.design.extraFiles = item.design.extraFiles.map((f) => {
          if (typeof f === 'string')
            return { name: f.split('/').pop(), url: f };
          return f;
        });
      }

      // ✅ Normalize uploadedLogo for consistency
      if (
        item.design?.uploadedLogo &&
        typeof item.design.uploadedLogo === 'string'
      ) {
        item.design.uploadedLogo = item.design.uploadedLogo.trim();
      }

      // ✅ Fallback product name (prevents “Unnamed Product”)
      item.name =
        item.name ||
        item.products_name ||
        item.product_name ||
        item.product?.products_name ||
        'Unnamed Product';

      return item;
    })
  );
}

// ================================================================
// ---------------- CREATE ORDER ----------------
// ================================================================
exports.createOrder = async (req, res) => {
  try {
    const { user, items, amount, paymentStatus, paymentmode } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // ✅ Enrich items with product details
    const enrichedItems = await Promise.all(
      items.map(async (it) => {
        const prod = await Product.findById(it.productId);
        if (!prod) throw new Error(`Product not found: ${it.productId}`);

        return {
          product: prod._id,
          name: prod.products_name || prod.name,
          image:
            Array.isArray(prod.image_url) && prod.image_url.length > 0
              ? prod.image_url[0]
              : '',
          qty: it.qty,
          size: it.size,
          color: it.color,
          price: it.price ?? prod.price,
          design: it.design || {}, // ✅ custom design data
        };
      })
    );

    let order;
    try {
      order = await Order.create({
        user,
        products: enrichedItems,
        price: amount,
        status: 'Pending',
        paymentStatus: paymentStatus || 'Paid',
        paymentmode: paymentmode || 'Prepaid',
      });
    } catch (createError) {
      if (createError.code === 11000) {
        // Duplicate key error - retry with a new orderId
        console.warn('⚠️ Duplicate orderId detected, retrying...');
        order = await Order.create({
          user,
          products: enrichedItems,
          price: amount,
          status: 'Pending',
          paymentStatus: paymentStatus || 'Paid',
          paymentmode: paymentmode || 'Prepaid',
          orderId: `ORD-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`, // Force new orderId
        });
      } else {
        throw createError;
      }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// ================================================================
// ---------------- GET ORDERS BY USER ----------------
// ================================================================
exports.getOrdersByUser = async (req, res) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 📨 GET /api/order/user/:userId called`);
  
  try {
    const userId = req.params.userId || req.user?._id;
    console.log(`[${new Date().toISOString()}] 👤 User ID: ${userId}`);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error(`[${new Date().toISOString()}] ❌ Invalid userId`);
      return res.status(400).json({ error: 'Invalid or missing userId' });
    }

    // ✅ PERFORMANCE FIX: Exclude base64 images from orders
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
      
      // ✅ CRITICAL: Remove base64 images from products array
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
            
            // Remove base64 from design object
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
      
      // ✅ FILTER OUT TRULY INVALID ORDERS (only those with no products at all)
      const beforeFilter = orders.length;
      orders = orders.filter(order => {
        const products = order.products || [];
        // Only filter out orders that have NO products array or empty array
        // Don't filter based on product content - that's too aggressive
        const hasProducts = Array.isArray(products) && products.length > 0;
        
        if (!hasProducts) {
          console.warn(`⚠️ Filtering out order ${order._id} - no products array`);
        }
        
        return hasProducts;
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
      data: orders || [],
      success: true,
      _debug: { totalMs: totalTime, count: orders.length }
    });
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ❌ Outer error after ${totalTime}ms:`, err.message);
    res.status(200).json({
      data: [],
      success: false,
      error: err.message
    });
  }
};

// ================================================================
// ---------------- GET ALL ORDERS (Admin Dashboard) ----------------
// ================================================================
exports.getAllOrders = async (req, res) => {
  try {
    // ✅ DISABLE CACHING: Force fresh data every time
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    // Check if this is a lightweight request (for dropdowns, etc.)
    const lightweight = req.query.lightweight === 'true';
    
    if (lightweight) {
      // For logistics dropdown - just return basic order info without enrichment
      const orders = await Order.find()
        .select('_id orderId status createdAt user')
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(500) // Limit to recent 500 orders
        .lean();
      
      return res.json({ success: true, orders });
    }

    // Simple mode - no enrichment, just raw data (FAST)
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const skip = (page - 1) * limit;
    
    // ✅ Support filtering by orderType (B2B or B2C)
    const orderType = req.query.orderType; // 'B2B' or 'B2C'
    const filter = {};
    if (orderType && ['B2B', 'B2C'].includes(orderType)) {
      filter.orderType = orderType;
    }

    console.log(`📦 Fetching orders: page ${page}, limit ${limit}, filter: ${JSON.stringify(filter)}`);

    try {
      // Get total count with timeout
      const totalOrders = await Order.countDocuments(filter).maxTimeMS(5000);
      console.log(`📦 Total orders in DB: ${totalOrders}`);

      // ✅ PERFORMANCE FIX: Fetch without base64 fields, clean in memory
      console.log(`📦 Executing find query with sort...`);
      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .maxTimeMS(10000);

      console.log(`✅ Found ${orders.length} orders (sorted by newest first)`);
      
      // ✅ Additional cleanup: Remove any remaining base64 (belt and suspenders)
      const cleanedOrders = orders.map(order => {
        if (order.products && Array.isArray(order.products)) {
          order.products = order.products.map(product => {
            const cleanProduct = { ...product };
            
            // Remove any remaining base64 fields
            delete cleanProduct.previewImages;
            
            if (cleanProduct.design) {
              const cleanDesign = { ...cleanProduct.design };
              delete cleanDesign.previewImages;
              ['front', 'back', 'left', 'right'].forEach(side => {
                if (cleanDesign[side]) {
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
      
      // ✅ FILTER OUT TRULY INVALID ORDERS (only those with no products at all)
      const beforeFilter = cleanedOrders.length;
      const validOrders = cleanedOrders.filter(order => {
        const products = order.products || [];
        // Only filter out orders that have NO products array or empty array
        // Don't filter based on product content - that's too aggressive
        const hasProducts = Array.isArray(products) && products.length > 0;
        
        if (!hasProducts) {
          console.warn(`⚠️ Admin filter: Excluding order ${order._id || order.orderId} - no products array`);
        }
        
        return hasProducts;
      });
      
      if (beforeFilter !== validOrders.length) {
        console.log(`✅ Filtered ${beforeFilter - validOrders.length} invalid orders, ${validOrders.length} valid remaining`);
      }

      // Return raw orders without enrichment for speed
      res.json({
        success: true,
        orders: validOrders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNextPage: page < Math.ceil(totalOrders / limit),
          hasPrevPage: page > 1
        }
      });
    } catch (queryErr) {
      console.error('❌ Database query failed:', queryErr.message);
      console.error('❌ Query error details:', queryErr);
      
      // Fallback: return empty result instead of crashing
      res.json({
        success: false,
        orders: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalOrders: 0,
          hasNextPage: false,
          hasPrevPage: false
        },
        error: 'Database query timeout. Please try again or contact support.'
      });
    }
  } catch (err) {
    console.error('❌ Error fetching orders:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      message: err.message 
    });
  }
};

// ================================================================
// ---------------- GET ORDER BY ID (Detailed View) ----------------
// ================================================================
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate('user', 'name email')
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // ✅ Fully normalized items (with base64 design flattening)
    const enrichedProducts = await enrichOrderProducts(order.products || []);

    res.json({ ...order, items: enrichedProducts });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// ================================================================
// ---------------- UPDATE ORDER STATUS ----------------
// ================================================================
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, paymentmode, deliveryExpectedDate } = req.body || {};

  console.log('🔥 updateOrderStatus HIT', req.body);

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // ⛔ STOP if shipment already created
    if (status === 'Processing' && order.shiprocket?.shipmentId) {
      console.log('⛔ Shiprocket already created for this order');
      return res.json({
        message: 'Shipment already exists',
        order,
      });
    }

    // ⛔ Status already Processing, skip Shiprocket
    if (order.status === 'Processing' && status === 'Processing') {
      console.log('⛔ Status already Processing, skipping Shiprocket');
      return res.json({
        message: 'Order already in Processing',
        order,
      });
    }

    const patch = {};
    const validStatuses = [
      'Pending',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
    ];

    if (typeof status !== 'undefined') {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      patch.status = status;
    }

    if (typeof paymentmode !== 'undefined') {
      const validModes = ['COD', 'Prepaid'];
      if (!validModes.includes(paymentmode)) {
        return res.status(400).json({ error: 'Invalid payment mode' });
      }
      patch.paymentmode = paymentmode;
    }

    if (deliveryExpectedDate) {
      const deliveryDate = new Date(deliveryExpectedDate);
      if (isNaN(deliveryDate.getTime())) {
        return res.status(400).json({ error: 'Invalid delivery date format' });
      }
      patch.deliveryExpectedDate = deliveryDate;
    }

    // =====================================================
    // 🚚 SHIPROCKET INTEGRATION (WITH FALLBACK)
    // =====================================================
    if (status === 'Processing' && !order.shiprocket?.shipmentId) {
      console.log('🚀 Attempting Shiprocket for order:', order.orderId);

      const shiprocketResult = await createShiprocketOrder(order);

      if (shiprocketResult.success) {
        patch.shiprocket = {
          shipmentId: shiprocketResult.data.shipment_id,
          awbCode: shiprocketResult.data.awb_code,
          courierName: shiprocketResult.data.courier_name,
          status: 'CREATED'
        };

        console.log('✅ Shiprocket shipment created:', shiprocketResult.data.shipment_id);

      } else {
        // ✅ FALLBACK MODE - Order proceeds with manual fulfillment
        patch.shiprocket = {
          status: 'PENDING_MANUAL',
          errorMessage: shiprocketResult.error
        };

        console.warn('⚠️ Shiprocket fallback activated:', shiprocketResult.error);
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();

    res.json({
      message: 'Order updated successfully',
      updatedFields: Object.keys(patch),
      order: updatedOrder,
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// ================================================================
// -------- REFETCH TRACKING ID FROM SHIPROCKET --------
// ================================================================
/**
 * Fetch AWB/Tracking code from Shiprocket and update order
 * Called by frontend when user wants to check for tracking number
 * Useful because AWB is assigned after shipment creation
 */
exports.refetchTrackingId = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order has shiprocket shipment
    if (!order.shiprocket?.shipmentId) {
      return res.status(400).json({ 
        error: 'No Shiprocket shipment found for this order',
        message: 'This order has not been shipped via Shiprocket'
      });
    }

    console.log(`🔄 Refetching tracking ID for order: ${order.orderId}, shipmentId: ${order.shiprocket.shipmentId}`);

    // Fetch AWB code from Shiprocket
    const awbResult = await fetchAndUpdateAwbCode(order.shiprocket.shipmentId);

    console.log(`[Refetch] Result from Shiprocket API:`, {
      success: awbResult.success,
      hasAwb: awbResult.hasAwb,
      awbCode: awbResult.awbCode,
      courierName: awbResult.courierName,
      status: awbResult.status
    });

    if (!awbResult.success) {
      return res.status(500).json({ 
        error: 'Failed to fetch tracking from Shiprocket',
        details: awbResult.error
      });
    }

    // If AWB is now available, update the order in MongoDB
    if (awbResult.hasAwb) {
      console.log(`✅ AWB is assigned: '${awbResult.awbCode}' - proceeding to save to database...`);
      
      try {
        const updatedOrder = await Order.findByIdAndUpdate(
          id,
          {
            $set: {
              'shiprocket.awbCode': awbResult.awbCode,
              'shiprocket.courierName': awbResult.courierName || order.shiprocket.courierName,
              'shiprocket.status': awbResult.status || order.shiprocket.status,
            }
          },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedOrder) {
          console.error(`❌ Failed to update order in MongoDB: Order not found`);
          return res.status(500).json({ 
            error: 'Failed to save tracking to database',
            details: 'Order update returned null'
          });
        }

        console.log(`✅ Successfully saved AWB to MongoDB for order ${order.orderId}: ${awbResult.awbCode}`);
        console.log(`✅ Updated shiprocket data:`, updatedOrder.shiprocket);

        return res.json({
          success: true,
          message: 'Tracking ID fetched and saved successfully',
          hasAwb: true,
          awbCode: awbResult.awbCode,
          courierName: awbResult.courierName,
          order: updatedOrder
        });
      } catch (dbErr) {
        console.error(`❌ Database error while saving AWB:`, dbErr.message);
        return res.status(500).json({ 
          error: 'Failed to save tracking to database',
          details: dbErr.message
        });
      }
    } else {
      // AWB not yet assigned, but shipment exists
      console.log(`⏳ AWB not yet assigned for shipment: ${order.shiprocket.shipmentId}`);
      console.log(`[Refetch] Shipment status from API: ${awbResult.status} | AWB code extracted: '${awbResult.awbCode}' | hasAwb flag: ${awbResult.hasAwb}`);
      
      const adminInstructions = {
        step1: 'Go to https://app.shiprocket.in',
        step2: `Find order: ${order.orderId} (Shipment ID: ${order.shiprocket.shipmentId})`,
        step3: 'Click "Schedule Pickup" button',
        step4: 'Select pickup date and confirm',
        step5: 'After pickup is scheduled, Shiprocket will assign AWB automatically'
      };

      return res.json({
        success: true,
        message: 'Shipment created but AWB not yet assigned. Admin must schedule pickup manually.',
        hasAwb: false,
        shipmentId: order.shiprocket.shipmentId,
        orderId: order.orderId,
        status: awbResult.status || 'PENDING',
        adminActions: {
          required: true,
          description: 'Shiprocket API does not support auto-pickup. Manual scheduling required.',
          instructions: adminInstructions,
          expectedWaitTime: '24-48 hours after scheduling pickup',
          autoPolling: 'System checks Shiprocket every 60 seconds for AWB updates'
        },
        userMessage: {
          title: '⏳ Your order is being processed',
          body: 'Your shipment has been created. The tracking ID will appear within 24-48 hours after our team schedules the pickup.',
          action: 'Check this page again soon for your tracking number'
        },
        order
      });
    }

  } catch (err) {
    console.error('Error refetching tracking ID:', err);
    res.status(500).json({ error: 'Failed to refetch tracking ID' });
  }
};
