/**
 * ⚠️ HARD DELETE ALL DESIGNS
 * Clears Design collection completely
 * (Images will be handled separately via Cloudinary)
 */

require("dotenv").config();

const mongoose = require("mongoose");

// ✅ Correct path (based on what you shared)
const Design = require("../Database/Models/DesignModel");

const DB_URL = process.env.DB_URL;

if (!DB_URL) {
  console.error("❌ DB_URL not found in environment variables");
  process.exit(1);
}

async function deleteAllDesigns() {
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to MongoDB");

    const count = await Design.countDocuments();
    console.log(`🎨 Total designs found: ${count}`);

    if (count === 0) {
      console.log("✅ No designs to delete");
      await mongoose.disconnect();
      process.exit(0);
    }

    const result = await Design.deleteMany({});
    console.log(`🔥 DELETED ${result.deletedCount} DESIGNS`);

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error deleting designs:", err);
    process.exit(1);
  }
}

deleteAllDesigns();
