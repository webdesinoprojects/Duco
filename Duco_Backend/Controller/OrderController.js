const mongoose = require('mongoose');
const Order = require('../DataBase/Models/OrderModel');
const Product = require('../DataBase/Models/ProductsModel');
const Design = require('../DataBase/Models/DesignModel');

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
  try {
    const userId = req.params.userId || req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid or missing userId' });
    }

    const sort = req.query.sort || '-createdAt';
    const orders = await Order.find({ user: userId })
      .populate('user', 'name email')
      .sort(sort)
      .lean();

    const enrichedOrders = await Promise.all(
      orders.map(async (o) => ({
        ...o,
        items: await enrichOrderProducts(o.products || []),
      }))
    );

    return res.json(enrichedOrders);
  } catch (err) {
    console.error('getOrdersByUser error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// ================================================================
// ---------------- GET ALL ORDERS (Admin Dashboard) ----------------
// ================================================================
exports.getAllOrders = async (req, res) => {
  try {
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

    // Full enrichment for admin dashboard
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Cap at 100
    const skip = (page - 1) * limit;

    console.log(`📦 Fetching orders: page ${page}, limit ${limit}`);

    // Use Promise.race to add timeout
    const fetchWithTimeout = (promise, timeout = 30000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 30s')), timeout)
        )
      ]);
    };

    const totalOrders = await fetchWithTimeout(Order.countDocuments());
    console.log(`📦 Total orders in DB: ${totalOrders}`);

    // Fetch orders without populate first (faster)
    const orders = await fetchWithTimeout(
      Order.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .maxTimeMS(25000) // MongoDB server-side timeout
    );

    console.log(`📦 Found ${orders.length} orders, enriching...`);

    // Enrich orders with timeout protection
    const enrichedOrders = await Promise.all(
      orders.map(async (o) => {
        try {
          return {
            ...o,
            items: await enrichOrderProducts(o.products || []),
          };
        } catch (enrichErr) {
          console.error(`⚠️ Failed to enrich order ${o._id}:`, enrichErr.message);
          // Return order without enrichment if it fails
          return {
            ...o,
            items: o.products || [],
          };
        }
      })
    );

    console.log(`✅ Successfully enriched ${enrichedOrders.length} orders`);

    res.json({
      success: true,
      orders: enrichedOrders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNextPage: page < Math.ceil(totalOrders / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    console.error('❌ Stack:', err.stack);
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
  const { status, paymentmode } = req.body || {};

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID' });
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

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      message: 'Order updated successfully',
      updatedFields: Object.keys(patch),
      order,
    });
  } catch (err) {
    console.error('Error updating order:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};
