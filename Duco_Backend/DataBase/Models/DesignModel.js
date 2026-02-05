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
      type: [Schema.Types.Mixed], // design metadata only (no raw image data)
      default: []
    },
    // ✅ Store Cloudinary preview image metadata only
    previewImages: {
      type: [
        {
          view: {
            type: String,
            enum: ['front', 'back', 'left', 'right']
          },
          url: { type: String },
          publicId: { type: String }
        }
      ],
      default: []
    },
    // ✅ Store additional files metadata only
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
