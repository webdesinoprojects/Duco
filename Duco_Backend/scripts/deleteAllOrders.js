/**
 * ⚠️ HARD DELETE ALL ORDERS
 * As instructed by senior dev
 * Loads .env explicitly
 */

require("dotenv").config(); // ✅ THIS WAS MISSING

const mongoose = require("mongoose");
const Order = require("../database/models/ordermodel");

// ✅ Your .env uses DB_URL
const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  console.error("❌ DB_URL not found in environment variables");
  process.exit(1);
}

async function deleteAllOrders() {
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to MongoDB");

    const count = await Order.countDocuments();
    console.log(`📦 Total orders found: ${count}`);

    const result = await Order.deleteMany({});
    console.log(`🔥 DELETED ${result.deletedCount} ORDERS`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error while deleting orders:", err);
    process.exit(1);
  }
}

deleteAllOrders();
