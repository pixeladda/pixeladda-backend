const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
} catch (error) {
  console.warn('Razorpay not configured. Payment routes will not work until keys are added.');
}

// Create order
router.post('/create-order', protect, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ error: 'Payment gateway not configured. Please add Razorpay credentials.' });
    }

    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if user already purchased this product
    if (req.user.purchasedProducts.includes(productId)) {
      return res.status(400).json({ error: 'You have already purchased this product' });
    }

    const amount = product.price * 100; // Convert to paise

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      payment_capture: 1
    });

    const order = await Order.create({
      orderId: razorpayOrder.id,
      user: req.user._id,
      product: productId,
      amount: product.price,
      currency: 'INR',
      razorpayOrderId: razorpayOrder.id,
      status: 'created'
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      order.status = 'paid';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.paidAt = new Date();
      await order.save();

      // Add product to user's purchased products
      await User.findByIdAndUpdate(order.user, {
        $addToSet: { purchasedProducts: order.product }
      });

      res.json({ success: true, message: 'Payment verified successfully', orderId: order._id });
    } else {
      const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
      if (order) {
        order.status = 'failed';
        await order.save();
      }
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature === expectedSignature) {
      const event = req.body.event;
      const payload = req.body.payload;

      if (event === 'payment.captured') {
        const orderId = payload.payment.entity.order_id;
        const order = await Order.findOne({ razorpayOrderId: orderId });
        
        if (order && order.status !== 'paid') {
          order.status = 'paid';
          order.razorpayPaymentId = payload.payment.entity.id;
          order.paidAt = new Date();
          await order.save();

          await User.findByIdAndUpdate(order.user, {
            $addToSet: { purchasedProducts: order.product }
          });
        }
      }
    }

    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
