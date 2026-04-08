const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["customer", "admin"],
    default: "customer",
  },
  // Subscription fields
  subscriptionPlan: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise"],
    default: "free",
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "expired", "cancelled"],
    default: "active",
  },
  subscriptionStartDate: {
    type: Date,
  },
  subscriptionEndDate: {
    type: Date,
  },
  // Download tracking
  downloadHistory: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
      downloadedAt: {
        type: Date,
        default: Date.now,
      },
      format: String,
      size: String,
    },
  ],
  monthlyDownloads: {
    type: Number,
    default: 0,
  },
  lastDownloadReset: {
    type: Date,
    default: Date.now,
  },
  // Legacy field
  purchasedProducts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
