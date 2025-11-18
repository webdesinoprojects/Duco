// routes/logistics.js
const express = require("express");
const router = express.Router();
const {
  createLogistic,
  updateLogistic,
  getLogisticsByOrder,
  getLogisticById,
  generateLabel,
  toggleSpeedLogistics,
  addDeliverySlip,
  removeDeliverySlip,
} = require("../Controller/logisticsController");

const {
  upload,
  uploadDeliverySlip,
  deleteDeliverySlip,
} = require("../Controller/cloudinaryUploadController");

// Create
router.post("/logistic", createLogistic);

// Update by logistic _id
router.patch("/logistic/:id", updateLogistic);

// Get by Order ID
router.get("/logistic/order/:orderId", getLogisticsByOrder);

// Get one by logistic _id
router.get("/logisticid/:id", getLogisticById);

// Generate shipping label
router.get("/logistics/:id/label", generateLabel);

// Toggle speed logistics
router.patch("/logistics/:id/speed", toggleSpeedLogistics);

// ✅ Delivery Slip Management
// Upload delivery slip to Cloudinary (supports both file upload and base64)
router.post("/logistics/delivery-slip/upload", upload.array('images', 2), uploadDeliverySlip);

// Add delivery slip URLs to logistic record
router.post("/logistics/:id/delivery-slip", addDeliverySlip);

// Remove delivery slip from logistic record
router.delete("/logistics/:id/delivery-slip", removeDeliverySlip);

// Delete delivery slip from Cloudinary
router.delete("/logistics/delivery-slip/delete", deleteDeliverySlip);

module.exports = router;
