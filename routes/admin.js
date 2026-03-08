const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');
const { getSignedViewUrl } = require('../utils/r2Storage');

// Helper function to add signed URLs to product
const addSignedUrlsToProduct = async (product) => {
  const productObj = product.toObject ? product.toObject() : product;
  
  if (productObj.previewImages && productObj.previewImages.length > 0) {
    productObj.previewImagesUrls = await Promise.all(
      productObj.previewImages.map(key => getSignedViewUrl(key))
    );
  }
  
  return productObj;
};

// Admin dashboard stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments({ status: 'paid' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCustomers = await User.countDocuments({ role: 'customer' });

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalCustomers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all products for admin
router.get('/products', protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    
    // Add signed URLs to all products
    const productsWithUrls = await Promise.all(
      products.map(product => addSignedUrlsToProduct(product))
    );
    
    res.json(productsWithUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
