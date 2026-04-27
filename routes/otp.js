const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

/** Generate a cryptographically random 6-digit OTP */
const gen6 = () => String(Math.floor(100000 + crypto.randomInt(900000)));

// @route   POST /api/otp/generate
// @desc    Generate start + end OTPs for a confirmed booking (called after advance payment)
router.post('/generate', protect, authorize('buyer'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId required' });

    const order = await Order.findById(bookingId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Idempotent — only generate once
    if (order.otpStart && order.otpEnd) {
      return res.json({
        success: true,
        message: 'OTPs already generated',
        otpStart: order.otpStart,
        otpEnd: order.otpEnd,
      });
    }

    order.otpStart = gen6();
    order.otpEnd = gen6();
    await order.save();

    res.status(201).json({
      success: true,
      otpStart: order.otpStart,
      otpEnd: order.otpEnd,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/otp/verify-start
// @desc    Supplier verifies start OTP to begin the service
router.post('/verify-start', protect, async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const order = await Order.findById(bookingId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned supplier can verify start OTP' });
    }
    if (order.otpStartVerified) {
      return res.json({ success: true, message: 'Start OTP already verified' });
    }
    if (order.otpStart !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    order.otpStartVerified = true;
    order.status = 'preparing'; // Equipment handover in progress
    await order.save();

    res.json({ success: true, message: 'Start OTP verified. Equipment handover confirmed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/otp/verify-end
// @desc    Supplier verifies end OTP to close the service + release balance payment
router.post('/verify-end', protect, async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const order = await Order.findById(bookingId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the assigned supplier can verify end OTP' });
    }
    if (!order.otpStartVerified) {
      return res.status(400).json({ success: false, message: 'Start OTP must be verified first' });
    }
    if (order.otpEndVerified) {
      return res.json({ success: true, message: 'End OTP already verified' });
    }
    if (order.otpEnd !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    order.otpEndVerified = true;
    order.status = 'delivered';
    await order.save();

    res.json({ success: true, message: 'End OTP verified. Service completed — balance payment released.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
