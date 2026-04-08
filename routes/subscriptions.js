const express = require("express");
const router = express.Router();
const {
  SubscriptionPlan,
  UserSubscription,
} = require("../models/Subscription");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  getDownloadsRemaining,
  isSubscriptionActive,
} = require("../utils/subscriptionHelper");

// Get all subscription plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({
      sortOrder: 1,
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's current subscription
router.get("/my-subscription", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const subscriptionInfo = {
      plan: user.subscriptionPlan,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      endDate: user.subscriptionEndDate,
      isActive: isSubscriptionActive(user),
      downloadsRemaining: getDownloadsRemaining(user),
      monthlyDownloads: user.monthlyDownloads,
    };

    res.json(subscriptionInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe to a plan (create Razorpay order)
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { planName, billingCycle } = req.body;

    if (!["basic", "premium", "enterprise"].includes(planName)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    if (!["monthly", "yearly"].includes(billingCycle)) {
      return res.status(400).json({ error: "Invalid billing cycle" });
    }

    const plan = await SubscriptionPlan.findOne({
      name: planName,
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const amount =
      billingCycle === "monthly" ? plan.price.monthly : plan.price.yearly;

    // Create Razorpay order (if payment gateway is configured)
    // For now, we'll create a pending subscription
    const subscription = await UserSubscription.create({
      user: req.user._id,
      plan: planName,
      status: "pending",
      billingCycle,
      amount,
      startDate: new Date(),
      endDate: new Date(
        Date.now() +
          (billingCycle === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000,
      ),
    });

    res.json({
      message: "Subscription order created",
      subscription,
      amount,
      // In production, include Razorpay order details here
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Activate subscription after payment verification
router.post("/activate", protect, async (req, res) => {
  try {
    const { subscriptionId, paymentId, orderId } = req.body;

    const subscription = await UserSubscription.findById(subscriptionId);

    if (
      !subscription ||
      subscription.user.toString() !== req.user._id.toString()
    ) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Update subscription status
    subscription.status = "active";
    subscription.paymentId = paymentId;
    subscription.orderId = orderId;
    await subscription.save();

    // Update user plan
    const user = await User.findById(req.user._id);
    user.subscriptionPlan = subscription.plan;
    user.subscriptionStatus = "active";
    user.subscriptionStartDate = subscription.startDate;
    user.subscriptionEndDate = subscription.endDate;
    await user.save();

    res.json({
      message: "Subscription activated successfully",
      subscription,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post("/cancel", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.subscriptionPlan === "free") {
      return res
        .status(400)
        .json({ error: "No active subscription to cancel" });
    }

    // Update user subscription
    user.subscriptionStatus = "cancelled";
    await user.save();

    // Update subscription record
    await UserSubscription.updateOne(
      { user: req.user._id, status: "active" },
      { status: "cancelled", autoRenew: false },
    );

    res.json({
      message:
        "Subscription cancelled successfully. You can continue using premium features until the end of your billing period.",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get subscription history
router.get("/history", protect, async (req, res) => {
  try {
    const subscriptions = await UserSubscription.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
