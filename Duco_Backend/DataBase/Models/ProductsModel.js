const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    products_name: { type: String, required: true },

    image_url: [
      {
        url: [{ type: String, required: true }],
        color: { type: String, required: true },
        colorcode: { type: String, required: true },
        videolink: { type: String },
        content: [
          {
            minstock: { type: Number, default: 1 },
            size: { type: String, required: true },
          },
        ],
        designtshirt: [
          {
            type: String,
          },
        ],
      },
    ],

    pricing: [
      {
        quantity: { type: Number, required: true },
        price_per: { type: Number, required: true },
        discount: { type: Number, default: 0, min: 0, max: 100 },
      },
    ],

    Stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    Desciptions: [{ type: String, required: true }],

    gender: {
      type: String,
      required: true,
      default: "Male",
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },

    // ✅ New field for Corporate vs Consumer segregation
    isCorporate: {
      type: Boolean,
      default: false, // false = B2C, true = B2B
    },

    // ✅ Optional Printrove integration fields
    printroveProductId: { type: Number },
    printroveVariantId: { type: Number },
  },
  { timestamps: true }
);

// ✅ Auto-calculate total stock before save
productSchema.pre("save", function (next) {
  let total = 0;
  this.image_url.forEach((imageItem) => {
    if (Array.isArray(imageItem.content)) {
      imageItem.content.forEach((contentItem) => {
        total += contentItem.minstock || 0;
      });
    }
  });
  this.Stock = total;
  next();
});

module.exports = mongoose.model("Product", productSchema);
