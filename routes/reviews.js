const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/reviews
// @desc    Buyer submits review after order completion
router.post('/', protect, authorize('buyer'), async (req, res) => {
  try {
    const { orderId, vendorId, rating, comment } = req.body;
    if (!orderId || !vendorId || !rating) {
      return res.status(400).json({ success: false, message: 'orderId, vendorId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be 1–5' });
    }

    // Verify order belongs to this buyer and is completed
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (order.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed orders' });
    }

    const review = await Review.create({
      buyerId: req.user.id,
      vendorId,
      orderId,
      rating,
      comment: comment || '',
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this order' });
    }
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/reviews/vendor/:vendorId
// @desc    Get all reviews for a vendor (public)
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const reviews = await Review.find({ vendorId: req.params.vendorId })
      .populate('buyerId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const avg =
      reviews.length
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0;

    res.json({ success: true, count: reviews.length, avgRating: avg, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
