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
    const customerEmail =
      order.customerPersonalInfo?.customerEmail ||
      order.addresses?.billing?.email ||
      order.address?.email ||
      order.email ||
      order.user?.email ||
      invoice?.order?.addresses?.billing?.email ||
      invoice?.order?.address?.email ||
      invoice?.order?.email;

    // ✅ Check if email was already sent for this order
    if (order.emailSent === true) {
      console.log(`⚠️ Email already sent for order ${order.orderId || order._id}, skipping duplicate send`);
      return res.json({
        success: true,
        emailSent: true,
        emailError: null,
        fileName,
        message: 'Email was already sent for this order'
      });
    }

    console.log(`📧 Sending email for order ${order.orderId || order._id} to ${customerEmail}`);
    const emailResult = await emailService.sendOrderConfirmation({
      customerEmail,
      customerName,
      orderId: order.orderId || order._id,
      totalAmount: totals?.grandTotal?.toFixed(2) || "0.00",
      currency: invoice?.currency || "INR",
      paymentMode: invoice?.paymentmode || "Online",
      invoicePdfPath: filePath,
      items: invoice?.items || [],
    });

    // ✅ Mark email as sent in order to prevent duplicates
    if (emailResult.success) {
      order.emailSent = true;
      await order.save();
      console.log(`✅ Email sent successfully and marked in order ${order.orderId || order._id}`);
    } else {
      console.warn(`⚠️ Email send failed for order ${order.orderId || order._id}:`, emailResult.error);
    }

    return res.json({
      success: true,
      emailSent: !!emailResult.success,
      emailError: emailResult.success ? null : emailResult.error,
      fileName,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to upload invoice",
    });
  }
});

module.exports = router
