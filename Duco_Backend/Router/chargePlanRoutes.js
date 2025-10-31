// routes/chargePlanRoutes.js
const express = require("express");
const router = express.Router();
const {
  getPlan,
  updatePlan,
  getRatesForQty,
  getTotalsForQty,
} = require("../Controller/chargePlanController");

// ✅ Get default charge plan
router.get("/", getPlan);

// ✅ Update charge plan
router.patch("/", updatePlan);

// ✅ Legacy endpoint (per-unit only)
router.post("/rates", getRatesForQty);

// ✅ NEW: Full totals endpoint (printing + P&F + GST + total)
router.get("/getTotalsForQty", getTotalsForQty);

module.exports = router;
