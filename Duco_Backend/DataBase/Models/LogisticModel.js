const mongoose = require('mongoose');

const LogisticSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    trackingNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    carrier: {
        type: String
    },
    estimatedDelivery: {
        type: Date
    },
    shippingAddress: {
        type: String,
        required: true
    },
    img:[
        {
            URL: { type: String }
        }
    ],
    // ✅ B2B Delivery Slip Images (max 2 images, 4MB each)
    deliverySlips: [
        {
            URL: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
            fileSize: { type: Number }, // in bytes
            fileName: { type: String }
        }
    ],
    note: {
        type: String
    },
    speedLogistics: {
        type: Boolean,
        default: false
    },
    labelGenerated: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// ✅ Validation: Max 2 delivery slips
LogisticSchema.pre('save', function(next) {
    if (this.deliverySlips && this.deliverySlips.length > 2) {
        return next(new Error('Maximum 2 delivery slip images allowed'));
    }
    
    // ✅ Validation: Max 4MB per image
    if (this.deliverySlips) {
        const maxSize = 4 * 1024 * 1024; // 4MB in bytes
        for (const slip of this.deliverySlips) {
            if (slip.fileSize && slip.fileSize > maxSize) {
                return next(new Error('Each delivery slip image must be less than 4MB'));
            }
        }
    }
    
    this.updatedAt = Date.now();
    next();
});
const Logistic = mongoose.model("Logistic", LogisticSchema);

module.exports = Logistic; // <-- default export is the MODEL