const mongoose = require('mongoose');
const { Schema } = mongoose;

const BlogSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: true,
    },
    featuredImage: {
      type: String,
      required: false,
      default: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800', // Default placeholder image
    },
    author: {
      name: {
        type: String,
        default: 'DUCO ART Team',
      },
      avatar: {
        type: String,
        // ✅ Use DUCO logo from assets - this will be served from frontend public folder
        default: 'https://ik.imagekit.io/vuavxn05l/duco-logo.png?updatedAt=1757162698605',
      },
    },
    category: {
      type: String,
      enum: ['Fashion', 'Design', 'Business', 'Tips', 'News', 'Tutorial'],
      default: 'Fashion',
    },
    tags: [{
      type: String,
      trim: true,
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

// Auto-generate slug from title if not provided
BlogSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  
  // Set publishedAt when status changes to published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Indexes for performance
BlogSchema.index({ slug: 1 });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ tags: 1 });

module.exports = mongoose.model('Blog', BlogSchema);
