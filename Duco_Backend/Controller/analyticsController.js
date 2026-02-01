// controllers/analyticsController.js
const mongoose = require("mongoose");
const Order = require("../DataBase/Models/OrderModel"); // adjust path if needed

const TZ = "Asia/Kolkata";

/**
 * Parse YYYY-MM-DD into IST day bounds (00:00:00.000 – 23:59:59.999 IST)
 * and return UTC Date objects so Mongo comparisons are correct.
 */
function parseDateRangeIST(from, to) {
  if (!from || !to) {
    const err = new Error("Query params 'from' and 'to' (YYYY-MM-DD) are required.");
    err.status = 400;
    throw err;
  }

  // Build ISO strings with explicit +05:30 offset so Node makes the right UTC instant.
  // IST has no DST, so +05:30 is stable.
  const startStr = `${from}T00:00:00.000+05:30`;
  const endStr   = `${to}T23:59:59.999+05:30`;

  const start = new Date(startStr);
  const end   = new Date(endStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    const err = new Error("Invalid 'from' or 'to' date. Use YYYY-MM-DD.");
    err.status = 400;
    throw err;
  }

  return { start, end };
}

function parseStatusArray(raw) {
  if (!raw) return null;
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getSalesAnalytics(req, res) {
  try {
    const { from, to, groupBy, status, includeCancelled } = req.query;
    
    // 🔍 DEBUG: Log incoming request parameters
    console.log('\n🔍 ANALYTICS REQUEST RECEIVED:');
    console.log('   📅 Date Range: from =', from, 'to =', to);
    console.log('   📊 Status Param (raw):', status);
    console.log('   📊 Include Cancelled:', includeCancelled);
    console.log('   📊 Group By:', groupBy);
    
    const { start, end } = parseDateRangeIST(from, to);

    const statusArray = parseStatusArray(status);
    const excludeCancelled = String(includeCancelled || "").toLowerCase() !== "true";
    
    // 🔍 DEBUG: Log parsed values
    console.log('   📊 Parsed Status Array:', statusArray);
    console.log('   📊 Exclude Cancelled:', excludeCancelled);

    // ===== MATCH (date + status) =====
    // ✅ Include ALL orders regardless of payment method
    const match = {
      createdAt: { $gte: start, $lte: end },
    };

    // 🔍 TEMPORARY DEBUG: Comment out status filter to see ALL orders
    if (statusArray && statusArray.length) {
      // match.status = { $in: statusArray }; // ⚠️ TEMPORARILY DISABLED FOR DEBUG
      console.log(`⚠️ Status filter DISABLED for debugging. Would filter: ${statusArray.join(', ')}`);
    } else if (excludeCancelled) {
      // match.status = { $ne: "Cancelled" }; // ⚠️ TEMPORARILY DISABLED FOR DEBUG
      console.log(`⚠️ Cancelled filter DISABLED for debugging.`);
    }

    // 🔍 DEBUG: Log what we're searching for
    console.log(`🔍 ANALYTICS DEBUG:`);
    console.log(`   Date Range: ${from} to ${to}`);
    console.log(`   UTC Range: ${start.toISOString()} to ${end.toISOString()}`);
    console.log(`   Match Query:`, JSON.stringify(match, null, 2));

    // 🔍 Check total orders in database (no filters)
    const totalInDB = await Order.countDocuments();
    console.log(`   📊 Total orders in DB: ${totalInDB}`);

    // 🔍 Check orders in date range (no status filter)
    const inDateRange = await Order.countDocuments({
      createdAt: { $gte: start, $lte: end }
    });
    console.log(`   📊 Orders in date range: ${inDateRange}`);

    // ===== SUMMARY =====
    const summaryAgg = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          // cast price to number if stored as string anywhere
          totalAmount: { $sum: { $toDouble: "$price" } },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalAmount: 1,
          avgOrderValue: {
            $cond: [
              { $gt: ["$totalOrders", 0] },
              { $divide: ["$totalAmount", "$totalOrders"] },
              0,
            ],
          },
        },
      },
    ]);

    const summary =
      summaryAgg[0] || { totalOrders: 0, totalAmount: 0, avgOrderValue: 0 };

    // ===== BREAKDOWN (optional) =====
    let breakdown = [];
    if (groupBy === "day" || groupBy === "month") {
      const dateFormat = groupBy === "day" ? "%Y-%m-%d" : "%Y-%m";
      breakdown = await Order.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: "$createdAt",
                timezone: TZ,
              },
            },
            totalAmount: { $sum: { $toDouble: "$price" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // ===== ORDERS (no pagination) =====
    // ✅ Include user, address, addresses, paymentCurrency (actual paid currency), display price, charges, and tax information
    const orders = await Order.find(match)
      .sort({ createdAt: -1 })
      .select("_id createdAt user price status razorpayPaymentId address addresses currency paymentCurrency displayPrice conversionRate pf printing gst cgst sgst igst products orderId orderType paymentmode paymentStatus paymentMethod printroveOrderId printroveStatus printroveTrackingUrl totalPay")
      .populate('user', 'name email phone') // ✅ Populate user details
      .lean();

    console.log(`📊 Sales Analytics Query - Date Range: ${from} to ${to}`);
    console.log(`📊 Match Criteria:`, JSON.stringify(match, null, 2));
    console.log(`📊 Total Orders Found: ${orders.length}`);
    
    if (orders.length === 0) {
      console.log(`⚠️ WARNING: No orders found! Debugging info:`);
      console.log(`   - Date range: ${from} to ${to}`);
      console.log(`   - UTC range: ${start.toISOString()} to ${end.toISOString()}`);
      console.log(`   - Status filter: ${statusArray ? statusArray.join(', ') : 'All except Cancelled'}`);
      
      // 🔍 Sample recent orders to compare
      const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).select('_id createdAt status paymentmode');
      console.log(`   📋 5 Most Recent Orders in DB:`, recentOrders.map(o => ({
        id: o._id,
        created: o.createdAt,
        status: o.status,
        mode: o.paymentmode
      })));
    } else {
      console.log(`📊 Order Payment Methods:`, orders.map(o => ({ id: o._id, mode: o.paymentmode, payStatus: o.paymentStatus })));
      console.log(`📊 Order Statuses:`, orders.map(o => ({ id: o._id, status: o.status, paymentmode: o.paymentmode })));
      console.log(`📊 All Order IDs returned:`, orders.map(o => o._id).join(', '));
    }

    return res.json({
      range: { from, to },
      summary,
      breakdown,
      orders,
    });
  } catch (err) {
    console.error("getSalesAnalytics error:", err);
    return res
      .status(err.status || 400)
      .json({ error: err.message || "Failed to fetch sales analytics" });
  }
}

module.exports = { getSalesAnalytics };

/**
 * Recommended Mongo indexes (create once in your schema or migration):
 *
 * db.orders.createIndex({ createdAt: 1 })
 * db.orders.createIndex({ status: 1, createdAt: 1 })
 * db.orders.createIndex({ razorpayPaymentId: 1, createdAt: 1 })
 *
 * These make the match/query + sort fast for your dashboard windows.
 */
