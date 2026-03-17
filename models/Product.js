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
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
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
  previewImages: [
    {
      type: String,
    },
  ],
  previewVideo: {
    type: String, // Store preview video key for video products
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
        type: String, // EPS, AI, CDR, PSD, JPEG, PNG, MP4, MOV, etc.
        required: true,
      },
      key: {
        type: String, // R2 storage key
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
  downloads: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);
