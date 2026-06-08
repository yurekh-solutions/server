const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const razorpay = require('../config/razorpay');
const { protect, authorize } = require('../middleware/auth');

const COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT) || 5;

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
// @desc    Supplier verifies end OTP to close the service + trigger auto-settlement
router.post('/verify-end', protect, async (req, res) => {
  try {
    const { bookingId, otp } = req.body;
    const order = await Order.findById(bookingId).populate('supplierId', 'razorpayAccountId name businessName');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.supplierId._id.toString() !== req.user.id) {
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

    // ─── AUTO-SETTLEMENT: Transfer supplier share ───────────────────────
    const supplierAmount = order.settlementAmount || Math.round(order.totalAmount * (100 - COMMISSION_PERCENT) / 100);
    const supplier = order.supplierId;

    // Only attempt real transfer if payment was via Razorpay and supplier has linked account
    if (razorpay && order.razorpayPaymentId && supplier?.razorpayAccountId) {
      try {
        order.settlementStatus = 'processing';
        await order.save();

        const transfer = await razorpay.payments.transfer(order.razorpayPaymentId, {
          transfers: [{
            account: supplier.razorpayAccountId,
            amount: Math.round(supplierAmount * 100), // paise
            currency: 'INR',
            notes: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              purpose: 'Auto-settlement on OTP completion',
            },
          }],
        });

        order.settlementTransferId = transfer.items?.[0]?.id || transfer.id || 'transfer_done';
        order.settlementStatus = 'settled';
        order.settledAt = new Date();
        await order.save();
      } catch (transferErr) {
        console.error('Auto-settlement transfer failed:', transferErr.message);
        order.settlementStatus = 'failed';
        await order.save();
        // Don't fail the OTP verification — settlement can be retried
      }
    } else {
      // Manual/demo mode: mark as settled
      order.settlementStatus = 'settled';
      order.settledAt = new Date();
      order.settlementTransferId = 'auto_' + Date.now();
      if (!order.settlementAmount) {
        order.platformCommission = Math.round(order.totalAmount * COMMISSION_PERCENT / 100);
        order.settlementAmount = order.totalAmount - order.platformCommission;
      }
      await order.save();
    }

    // Update supplier stats
    await User.findByIdAndUpdate(supplier._id || supplier, {
      $inc: { totalEarnings: supplierAmount, totalOrders: 1 },
    });

    // Notify supplier about earnings
    await Notification.create({
      userId: supplier._id || supplier,
      type: 'payment',
      title: 'Service Complete — Payment Released! 💰',
      message: `₹${supplierAmount.toLocaleString('en-IN')} will be credited to your account for order #${order.orderNumber}`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      message: 'End OTP verified. Service completed — payment released to supplier.',
      settlement: {
        supplierAmount,
        platformCommission: order.platformCommission,
        status: order.settlementStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
