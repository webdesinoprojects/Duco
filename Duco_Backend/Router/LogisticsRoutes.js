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
} = require("../Controller/logisticsController");

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

module.exports = router;
