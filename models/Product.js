const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  // Tags for better discoverability
  tags: [
    {
      type: String,
      trim: true,
      lowercase: true,
    },
  ],
  // Premium model fields
  isPremium: {
    type: Boolean,
    default: false,
  },
  requiredPlan: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise"],
    default: "free",
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  isFree: {
    type: Boolean,
    default: false,
  },
  // Trending and popularity metrics
  views: {
    type: Number,
    default: 0,
  },
  downloads: {
    type: Number,
    default: 0,
  },
  likes: {
    type: Number,
    default: 0,
  },
  trendingScore: {
    type: Number,
    default: 0,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  previewImages: [
    {
      type: String,
    },
  ],
  previewVideo: {
    type: String,
  },
  // Legacy fields (kept for backward compatibility)
  fileKey: {
    type: String,
  },
  fileName: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  // New file system - supports multiple formats
  files: [
    {
      format: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
      fileName: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
      },
      isPrimary: {
        type: Boolean,
        default: false,
      },
    },
  ],
  productType: {
    type: String,
    enum: ["vector", "raster", "video", "template", "other"],
    default: "other",
  },
  // SEO fields
  metaTitle: {
    type: String,
  },
  metaDescription: {
    type: String,
  },
  metaKeywords: [
    {
      type: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
productSchema.index({ tags: 1 });
productSchema.index({ trendingScore: -1 });
productSchema.index({ views: -1 });
productSchema.index({ downloads: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ isPremium: 1, requiredPlan: 1 });

// Generate slug from title before saving
productSchema.pre("save", function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  // Update timestamp
  this.updatedAt = new Date();

  // Calculate trending score
  this.calculateTrendingScore();

  next();
});

// Method to calculate trending score based on views, downloads, and recency
productSchema.methods.calculateTrendingScore = function () {
  const daysSinceCreation =
    (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0, 30 - daysSinceCreation) / 30; // Higher for newer items

  // Weighted scoring
  this.trendingScore =
    this.views * 0.3 +
    this.downloads * 2 +
    this.likes * 1.5 +
    recencyFactor * 100;

  // Mark as trending if score is above threshold
  this.isTrending = this.trendingScore > 50;
};

module.exports = mongoose.model("Product", productSchema);
