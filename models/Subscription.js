const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ["free", "basic", "premium", "enterprise"],
  },
  displayName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    monthly: {
      type: Number,
      default: 0,
    },
    yearly: {
      type: Number,
      default: 0,
    },
  },
  limits: {
    downloadsPerMonth: {
      type: Number,
      default: 0,
    },
    premiumAccess: {
      type: Boolean,
      default: false,
    },
    aiToolsAccess: {
      type: Boolean,
      default: false,
    },
    commercialUse: {
      type: Boolean,
      default: false,
    },
  },
  features: [
    {
      type: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// User subscription history model
const userSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  plan: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled", "pending"],
    default: "active",
  },
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },
  amount: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  paymentId: {
    type: String,
  },
  orderId: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SubscriptionPlan = mongoose.model(
  "SubscriptionPlan",
  subscriptionPlanSchema,
);
const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema,
);

module.exports = { SubscriptionPlan, UserSubscription };
