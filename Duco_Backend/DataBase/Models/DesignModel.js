// models/DesignModel.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const DesignSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    products: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      
    },
    cutomerprodcuts:{
        type:String,
        default:null
    },
    design: {
      type: [Schema.Types.Mixed], // can hold array of objects
      default: []
    },
    // ✅ CRITICAL: Explicitly store preview images
    previewImages: {
      type: {
        front: String,  // Data URL
        back: String,   // Data URL
        left: String,   // Data URL
        right: String   // Data URL
      },
      default: {}
    },
    // ✅ CRITICAL: Explicitly store additional files metadata
    additionalFilesMeta: {
      type: [{
        name: String,
        size: Number,
        type: String
      }],
      default: []
    }
  },
  {
    timestamps: true // adds createdAt and updatedAt
  }
);

module.exports = mongoose.model('Design', DesignSchema);
