const mongoose = require("mongoose")

const BannerSchema = new mongoose.Schema({
    link: {
        type: String,
        required: true
    },
    // Optional: Hero section text and button data
    heroText: {
        type: String,
        default: "Color Of Summer Outfit"
    },
    buttonText: {
        type: String,
        default: "Shop the Look →"
    },
    buttonLink: {
        type: String,
        default: "/women"
    },
    // Optional: Banner type (hero, promotional, etc.)
    type: {
        type: String,
        enum: ['hero', 'promotional', 'seasonal'],
        default: 'hero'
    },
    // Optional: Active status
    isActive: {
        type: Boolean,
        default: true
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

module.exports = mongoose.model("banner", BannerSchema);