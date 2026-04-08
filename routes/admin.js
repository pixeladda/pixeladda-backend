const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Category = require("../models/Category");
const {
  SubscriptionPlan,
  UserSubscription,
} = require("../models/Subscription");
const { protect, adminOnly } = require("../middleware/auth");
const { getSignedViewUrl } = require("../utils/r2Storage");

// Helper function to add signed URLs to product
const addSignedUrlsToProduct = async (product) => {
  const productObj = product.toObject ? product.toObject() : product;

  if (productObj.previewImages && productObj.previewImages.length > 0) {
    productObj.previewImagesUrls = await Promise.all(
      productObj.previewImages.map((key) => getSignedViewUrl(key)),
    );
  }

  return productObj;
};

// Admin dashboard stats
router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments({ status: "paid" });
    const totalRevenue = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Subscription stats
    const subscriptionStats = await User.aggregate([
      { $match: { role: "customer" } },
      {
        $group: {
          _id: "$subscriptionPlan",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total downloads
    const totalDownloads = await Product.aggregate([
      { $group: { _id: null, total: { $sum: "$downloads" } } },
    ]);

    // Total views
    const totalViews = await Product.aggregate([
      { $group: { _id: null, total: { $sum: "$views" } } },
    ]);

    // Monthly subscription revenue
    const subscriptionRevenue = await UserSubscription.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    // Recent activity
    const recentDownloads = await User.aggregate([
      { $unwind: "$downloadHistory" },
      { $sort: { "downloadHistory.downloadedAt": -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "downloadHistory.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $project: {
          userName: "$name",
          userEmail: "$email",
          productTitle: { $arrayElemAt: ["$productInfo.title", 0] },
          downloadedAt: "$downloadHistory.downloadedAt",
          format: "$downloadHistory.format",
        },
      },
    ]);

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers,
      subscriptionStats: subscriptionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      totalDownloads: totalDownloads[0]?.total || 0,
      totalViews: totalViews[0]?.total || 0,
      subscriptionRevenue: subscriptionRevenue[0]?.total || 0,
      recentDownloads,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products for admin
router.get("/products", protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });

    // Add signed URLs to all products
    const productsWithUrls = await Promise.all(
      products.map((product) => addSignedUrlsToProduct(product)),
    );

    res.json(productsWithUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users with subscription info
router.get("/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "customer" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subscriptions
router.get("/subscriptions", protect, adminOnly, async (req, res) => {
  try {
    const subscriptions = await UserSubscription.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user subscription
router.patch(
  "/users/:userId/subscription",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { subscriptionPlan, subscriptionStatus, subscriptionEndDate } =
        req.body;

      const user = await User.findById(req.params.userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;
      if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
      if (subscriptionEndDate) user.subscriptionEndDate = subscriptionEndDate;

      await user.save();

      res.json({ message: "User subscription updated successfully", user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Toggle product featured status
router.patch(
  "/products/:productId/featured",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      product.isFeatured = !product.isFeatured;
      await product.save();

      res.json({
        message: "Product featured status updated",
        isFeatured: product.isFeatured,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Toggle product premium status
router.patch(
  "/products/:productId/premium",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { isPremium, requiredPlan } = req.body;

      const product = await Product.findById(req.params.productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (isPremium !== undefined) product.isPremium = isPremium;
      if (requiredPlan) product.requiredPlan = requiredPlan;

      await product.save();

      res.json({ message: "Product premium status updated", product });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update product tags
router.patch(
  "/products/:productId/tags",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { tags } = req.body;

      const product = await Product.findById(req.params.productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      product.tags = tags.map((tag) => tag.toLowerCase().trim());
      await product.save();

      res.json({ message: "Product tags updated", tags: product.tags });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Get analytics data for charts
router.get("/analytics", protect, adminOnly, async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Calculate date range
    const daysAgo = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Downloads over time
    const downloadsOverTime = await Product.aggregate([
      { $unwind: "$downloads" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Revenue over time
    const revenueOverTime = await Order.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top performing products
    const topProducts = await Product.find({ isActive: true })
      .select("title downloads views category")
      .populate("category", "name")
      .sort({ downloads: -1 })
      .limit(10);

    // Category distribution
    const categoryDistribution = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          downloads: { $sum: "$downloads" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $project: {
          categoryName: { $arrayElemAt: ["$categoryInfo.name", 0] },
          count: 1,
          downloads: 1,
        },
      },
    ]);

    res.json({
      downloadsOverTime,
      revenueOverTime,
      topProducts,
      categoryDistribution,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
