const mongoose = require('mongoose');
const { Schema } = mongoose;

// ------------------ Address Sub-Schema ------------------
const AddressSchema = new Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    mobileNumber: { type: String },
    houseNumber: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    landmark: { type: String, default: '' },
    addressType: {
      type: String,
      enum: ['Home', 'Office', 'Other'],
      default: 'Home',
    },
  },
  { _id: false }
);

// ------------------ Order Schema ------------------
const OrderSchema = new Schema(
  {
    orderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    products: [
      {
        type: Schema.Types.Mixed,
        required: true,
      },
    ],

    price: { type: Number, required: true },
    totalPay: { type: Number, required: true }, // ✅ Add totalPay field for Printrove compatibility
    currency: { type: String, default: 'INR' },

    address: { type: AddressSchema, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ New: Distinguish Corporate vs Retail orders
    orderType: {
      type: String,
      enum: ['B2B', 'B2C'],
      default: 'B2C',
    },

    deliveryExpectedDate: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },

    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },

    razorpayPaymentId: { type: String, default: null },

    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },

    // ✅ All payment modes you currently support
    paymentmode: {
      type: String,
      enum: [
        'online',
        'Online Payment',
        'netbanking',
        'Paid via Netbanking',
        'store_pickup',
        'Pay on Store',
        'manual_payment',
        'Manual Payment',
        '50%',
        'COD',
        'Prepaid',
      ],
      default: 'online',
    },

    // ------------------ 🔹 Printrove Integration Fields ------------------
    printroveOrderId: { type: String, default: null }, // ID returned by Printrove
    printroveStatus: {
      type: String,
      enum: [
        'Pending',
        'Processing',
        'Received',
        'Dispatched',
        'Delivered',
        'Cancelled',
        'Error',
        'success', // added lowercase success (API response)
        'Corporate Order - No Printrove', // for corporate orders that skip Printrove
        'N/A', // for orders that don't use Printrove
      ],
      default: 'Pending',
    },

    printroveItems: { type: Array, default: [] }, // store Printrove line-items
    printroveTrackingUrl: { type: String, default: '' }, // tracking link if available
    
    // ✅ Enhanced Printrove tracking fields
    printroveReceivedDate: { type: Date, default: null }, // when Printrove received the order
    printroveDispatchDate: { type: Date, default: null }, // when order was dispatched
    printroveShippedDate: { type: Date, default: null }, // when order was shipped
    printroveDeliveredDate: { type: Date, default: null }, // when order was delivered
    printroveEstimatedDelivery: { type: Date, default: null }, // Printrove's delivery estimate
    // ----------------------------------------------------

    pf: { type: Number, default: 0 },
    gst: { type: Number, default: 0 }, // Keep for backward compatibility
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    printing: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ------------------ Auto-generate Order ID ------------------
OrderSchema.pre('save', async function (next) {
  if (this.orderId) return next();

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const yy = String(yyyy).slice(-2); // Last 2 digits of year
      const nextYearYy = String(yyyy + 1).slice(-2); // Next year's last 2 digits
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      // Generate sequential number for the day
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const todayOrderCount = await mongoose.model('Order').countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });
      
      const sequentialNumber = String(todayOrderCount + 1).padStart(2, '0');

      // Format: ducoart2025/26/01 (ducoart + current_year + next_year + sequential_number)
      let orderId = `ducoart${yyyy}/${yy}/${sequentialNumber}`;

      // Check if this orderId already exists
      const existingOrder = await mongoose.model('Order').findOne({ orderId });
      if (!existingOrder) {
        this.orderId = orderId;
        return next();
      }

      attempts++;

      // If we've tried too many times, add timestamp suffix
      if (attempts >= maxAttempts) {
        const timestamp = Date.now().toString().slice(-4);
        this.orderId = `ducoart${yyyy}/${yy}/${sequentialNumber}-${timestamp}`;
        return next();
      }

      // Small delay before retry
      await new Promise((resolve) => setTimeout(resolve, 10));
    } catch (err) {
      console.error('Error generating orderId:', err);
      attempts++;

      if (attempts >= maxAttempts) {
        // Final fallback
        const today = new Date();
        const yyyy = today.getFullYear();
        const yy = String(yyyy).slice(-2);
        const timestamp = Date.now().toString().slice(-6);
        this.orderId = `ducoart${yyyy}/${yy}/${timestamp}`;
        return next();
      }
    }
  }
});

// ------------------ Indexes for Performance ------------------
OrderSchema.index({ createdAt: -1 }); // Index for sorting by creation date (newest first)
OrderSchema.index({ user: 1, createdAt: -1 }); // Compound index for user orders
OrderSchema.index({ orderId: 1 }); // Index for order ID lookups
OrderSchema.index({ printroveOrderId: 1 }); // Index for Printrove order lookups

module.exports = mongoose.model('Order', OrderSchema);
