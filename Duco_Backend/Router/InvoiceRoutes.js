const express = require("express")
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path");
const Order = require("../DataBase/Models/OrderModel");
const emailService = require("../Service/EmailService");
const { getInvoiceByOrderId } = require("../Controller/invoiceService")

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});


// GET /api/invoices/by-order/:orderId
// GET /api/invoices/by-order/:id
router.get("/invoice/:id", async (req, res) => {
  try {
    const { invoice, totals } = await getInvoiceByOrderId(req.params.id); 
    res.json({ invoice, totals });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to fetch invoice" });
  }
});

// POST /api/invoice/upload/:orderId
router.post("/invoice/upload/:orderId", upload.single("file"), async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Invoice PDF is required" });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
    }

    const order = await Order.findOne({ orderId }) || await Order.findById(orderId).catch(() => null);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const invoicesDir = path.join(__dirname, "..", "invoices");
    await fs.mkdir(invoicesDir, { recursive: true });
    const fileName = `invoice-${order._id}.pdf`;
    const filePath = path.join(invoicesDir, fileName);
    await fs.writeFile(filePath, req.file.buffer);

    const { invoice, totals } = await getInvoiceByOrderId(order._id);
    const customerName =
      order.addresses?.billing?.fullName ||
      order.address?.fullName ||
      order.user?.name ||
      "Valued Customer";

    // ✅ Invoice saved successfully
    console.log(`✅ Invoice PDF saved for order ${order.orderId || order._id}`);

    return res.json({
      success: true,
      emailSent: false,
      emailError: null,
      fileName,
      message: 'Invoice PDF saved successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload invoice",
    });
  }
});

module.exports = router
