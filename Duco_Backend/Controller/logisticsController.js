// controllers/logisticsController.js
const mongoose = require("mongoose");
const Logistic = require("../DataBase/Models/LogisticModel"); // <- adjust path if different

// Small helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Create Logistic
 * Body: { orderId, trackingNumber?, carrier?, estimatedDelivery?, shippingAddress, img?, note? }
 */
 const createLogistic = async (req, res) => {
  try {
    const {
      orderId,
      trackingNumber,
      carrier,
      estimatedDelivery,
      shippingAddress,
      img = [],
      note,
      speedLogistics = false,
      labelGenerated = false,
    } = req.body;

    if (!orderId || !isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Valid orderId is required" });
    }
    if (!shippingAddress) {
      return res.status(400).json({ error: "shippingAddress is required" });
    }

    // Normalize img to array of { URL }
    const imgArr = Array.isArray(img)
      ? img.map((i) => ({ URL: typeof i === "string" ? i : i?.URL }))
      : [];

    const logistic = await Logistic.create({
      orderId,
      trackingNumber,
      carrier,
      estimatedDelivery,
      shippingAddress,
      img: imgArr,
      note,
      speedLogistics,
      labelGenerated,
    });

    // Optional: populate order basic fields
    await logistic.populate({ path: "orderId", select: "_id status total" });

    return res.status(201).json(logistic);
  } catch (err) {
    // handle unique index error for trackingNumber
    if (err?.code === 11000 && err?.keyPattern?.trackingNumber) {
      return res
        .status(409)
        .json({ error: "trackingNumber already exists" });
    }
    console.error("createLogistic error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Update Logistic by _id
 * Params: :id
 * Body: any of { trackingNumber, carrier, estimatedDelivery, shippingAddress, img, note }
 */  
 const  updateLogistic = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    const payload = { ...req.body, updatedAt: new Date() };

    // If img provided, normalize to [{ URL }]
    if (payload.img) {
      payload.img = Array.isArray(payload.img)
        ? payload.img.map((i) => ({ URL: typeof i === "string" ? i : i?.URL }))
        : [];
    }

    const updated = await Logistic.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate({ path: "orderId", select: "_id status total" });

    if (!updated) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    return res.json(updated);
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.trackingNumber) {
      return res
        .status(409)
        .json({ error: "trackingNumber already exists" });
    }
    console.error("updateLogistic error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get Logistics by Order ID
 * Params: :orderId
 * Query: ?populate=true (optional)
 */
const  getLogisticsByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { populate } = req.query;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Invalid orderId" });
    }

    let query = Logistic.find({ orderId }).sort({ createdAt: -1 });

    if (String(populate).toLowerCase() === "true") {
      query = query.populate({ path: "orderId", select: "_id status total" });
    }

    const items = await query.exec();
    return res.json(items);
  } catch (err) {
    console.error("getLogisticsByOrder error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * (Optional) Get single logistic by _id
 */
const getLogisticById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    const item = await Logistic.findById(id).populate({
      path: "orderId",
      select: "_id status total",
    });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error("getLogisticById error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Generate Shipping Label
 * Params: :id
 * Query: ?format=pdf|jpg (default: pdf)
 */
const generateLabel = async (req, res) => {
  try {
    const { id } = req.params;
    const format = req.query.format || 'pdf';

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    const logistic = await Logistic.findById(id).populate({
      path: "orderId",
      select: "_id orderId status total address",
    });

    if (!logistic) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    // For now, generate a simple text-based label
    // In production, you'd use a PDF library like pdfkit or an image library
    const labelContent = `
SHIPPING LABEL
==============
Order ID: ${logistic.orderId?.orderId || logistic.orderId?._id || 'N/A'}
Tracking Number: ${logistic.trackingNumber || 'N/A'}
Carrier: ${logistic.carrier || 'N/A'}
Estimated Delivery: ${logistic.estimatedDelivery ? new Date(logistic.estimatedDelivery).toLocaleDateString() : 'N/A'}

SHIPPING ADDRESS:
${logistic.shippingAddress}

Speed Logistics: ${logistic.speedLogistics ? 'YES' : 'NO'}
Generated: ${new Date().toLocaleString()}
    `.trim();

    // Set appropriate headers based on format
    if (format === 'jpg' || format === 'jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `attachment; filename="label-${id}.jpg"`);
      // For now, return text. In production, generate actual image
      return res.status(501).json({ 
        error: "JPG generation not yet implemented. Use PDF format.",
        message: "Please install image generation library (e.g., canvas, sharp)"
      });
    } else {
      // Return as plain text for now (in production, use pdfkit)
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="label-${id}.txt"`);
      return res.send(labelContent);
    }
  } catch (err) {
    console.error("generateLabel error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Toggle Speed Logistics
 * Params: :id
 * Body: { speedLogistics: boolean }
 */
const toggleSpeedLogistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { speedLogistics } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    if (typeof speedLogistics !== 'boolean') {
      return res.status(400).json({ error: "speedLogistics must be a boolean" });
    }

    const updated = await Logistic.findByIdAndUpdate(
      id,
      { speedLogistics, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate({ path: "orderId", select: "_id status total" });

    if (!updated) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    return res.json({
      message: `Speed logistics ${speedLogistics ? 'enabled' : 'disabled'}`,
      logistic: updated
    });
  } catch (err) {
    console.error("toggleSpeedLogistics error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Add Delivery Slip to Logistic
 * Params: :id (logistic ID)
 * Body: { deliverySlips: [{ URL, fileSize, fileName }] }
 */
const addDeliverySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliverySlips } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    if (!deliverySlips || !Array.isArray(deliverySlips)) {
      return res.status(400).json({ error: "deliverySlips array is required" });
    }

    const logistic = await Logistic.findById(id);
    if (!logistic) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    // Check if adding these would exceed the limit
    const currentCount = logistic.deliverySlips?.length || 0;
    const newCount = currentCount + deliverySlips.length;

    if (newCount > 2) {
      return res.status(400).json({ 
        error: `Cannot add ${deliverySlips.length} slip(s). Maximum 2 delivery slips allowed. Current: ${currentCount}` 
      });
    }

    // Validate file sizes
    const maxSize = 4 * 1024 * 1024; // 4MB
    for (const slip of deliverySlips) {
      if (slip.fileSize && slip.fileSize > maxSize) {
        return res.status(400).json({ 
          error: `File ${slip.fileName || 'unknown'} exceeds 4MB limit` 
        });
      }
    }

    // Add delivery slips
    const slipsToAdd = deliverySlips.map(slip => ({
      URL: slip.URL,
      uploadedAt: new Date(),
      fileSize: slip.fileSize || 0,
      fileName: slip.fileName || 'delivery-slip.jpg'
    }));

    logistic.deliverySlips = [...(logistic.deliverySlips || []), ...slipsToAdd];
    logistic.updatedAt = new Date();
    await logistic.save();

    return res.json({
      success: true,
      message: `Added ${slipsToAdd.length} delivery slip(s)`,
      logistic
    });
  } catch (err) {
    console.error("addDeliverySlip error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

/**
 * Remove Delivery Slip from Logistic
 * Params: :id (logistic ID)
 * Body: { slipIndex: number } or { slipURL: string }
 */
const removeDeliverySlip = async (req, res) => {
  try {
    const { id } = req.params;
    const { slipIndex, slipURL } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid logistic id" });
    }

    const logistic = await Logistic.findById(id);
    if (!logistic) {
      return res.status(404).json({ error: "Logistic not found" });
    }

    if (!logistic.deliverySlips || logistic.deliverySlips.length === 0) {
      return res.status(400).json({ error: "No delivery slips to remove" });
    }

    // Remove by index or URL
    if (typeof slipIndex === 'number') {
      if (slipIndex < 0 || slipIndex >= logistic.deliverySlips.length) {
        return res.status(400).json({ error: "Invalid slip index" });
      }
      logistic.deliverySlips.splice(slipIndex, 1);
    } else if (slipURL) {
      const indexToRemove = logistic.deliverySlips.findIndex(slip => slip.URL === slipURL);
      if (indexToRemove === -1) {
        return res.status(404).json({ error: "Delivery slip not found" });
      }
      logistic.deliverySlips.splice(indexToRemove, 1);
    } else {
      return res.status(400).json({ error: "Provide either slipIndex or slipURL" });
    }

    logistic.updatedAt = new Date();
    await logistic.save();

    return res.json({
      success: true,
      message: "Delivery slip removed",
      logistic
    });
  } catch (err) {
    console.error("removeDeliverySlip error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createLogistic,
  updateLogistic,
  getLogisticsByOrder,
  getLogisticById,
  generateLabel,
  toggleSpeedLogistics,
  addDeliverySlip,
  removeDeliverySlip,
};