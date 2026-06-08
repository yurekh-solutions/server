// ────────────────────────────────────────────────────────────────────────────
// Payment Routes — Razorpay Escrow (Uber-like model)
// Flow: Buyer pays 100% → Platform holds → OTP verified → 95% to Supplier
// ────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Notification = require('../models/Notification');
const razorpay = require('../config/razorpay');
const { protect: auth } = require('../middleware/auth');

const COMMISSION_PERCENT = Number(process.env.PLATFORM_COMMISSION_PERCENT) || 5;

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE RAZORPAY ORDER — Buyer initiates payment
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-order', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // If already paid, return existing info
    if (order.paymentStatus === 'paid') {
      return res.json({
        success: true,
        message: 'Order already paid',
        razorpayOrderId: order.razorpayOrderId,
      });
    }

    // If Razorpay is not configured, use demo mode
    if (!razorpay) {
      // Demo mode: simulate payment success immediately
      order.paymentStatus = 'paid';
      order.paymentMethod = 'razorpay';
      order.status = 'confirmed';
      order.commissionPercent = COMMISSION_PERCENT;
      order.platformCommission = Math.round(order.totalAmount * COMMISSION_PERCENT / 100);
      order.settlementAmount = order.totalAmount - order.platformCommission;
      await order.save();

      return res.json({
        success: true,
        demo: true,
        message: 'Demo mode — payment auto-confirmed',
        orderId: order._id,
        razorpayOrderId: 'demo_order_' + order._id,
        amount: order.totalAmount * 100,
        currency: 'INR',
        keyId: 'rzp_test_demo',
      });
    }

    // Create Razorpay Order (amount in paise)
    const amountPaise = Math.round(order.totalAmount * 100);
    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.orderNumber || order._id.toString(),
      notes: {
        orderId: order._id.toString(),
        buyerId: req.user.id,
        orderNumber: order.orderNumber || '',
      },
    });

    // Save Razorpay order ID to our order
    order.razorpayOrderId = rzpOrder.id;
    order.commissionPercent = COMMISSION_PERCENT;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ success: false, message: 'Payment order creation failed', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFY PAYMENT — After buyer completes Razorpay checkout
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify', auth, async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!orderId || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Verify signature (HMAC SHA256)
    if (razorpay && process.env.RAZORPAY_KEY_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        order.paymentStatus = 'failed';
        await order.save();
        return res.status(400).json({ success: false, message: 'Payment verification failed — invalid signature' });
      }
    }

    // Payment verified — update order
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentStatus = 'paid';
    order.paymentMethod = 'razorpay';
    order.status = 'confirmed';
    order.platformCommission = Math.round(order.totalAmount * order.commissionPercent / 100);
    order.settlementAmount = order.totalAmount - order.platformCommission;
    order.paymentDetails = {
      ...order.paymentDetails,
      paidAt: new Date(),
      transactionId: razorpay_payment_id,
    };
    await order.save();

    // Notify supplier that payment is confirmed
    await Notification.create({
      userId: order.supplierId,
      type: 'payment',
      title: 'Payment Received',
      message: `Payment of ₹${order.totalAmount.toLocaleString('en-IN')} confirmed for order #${order.orderNumber}. Accept the order to proceed.`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        settlementAmount: order.settlementAmount,
        platformCommission: order.platformCommission,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SETTLE PAYMENT — Auto-triggered after End OTP verified
//    Transfers supplier share via Razorpay Route (split payment)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/settle', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('supplierId', 'razorpayAccountId name businessName');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only allow settlement of completed orders
    if (!order.otpEndVerified) {
      return res.status(400).json({ success: false, message: 'End OTP must be verified before settlement' });
    }
    if (order.settlementStatus === 'settled') {
      return res.json({ success: true, message: 'Already settled', settlementTransferId: order.settlementTransferId });
    }

    order.settlementStatus = 'processing';
    await order.save();

    const supplierAmount = order.settlementAmount || (order.totalAmount - order.platformCommission);
    const supplier = order.supplierId;

    // If Razorpay Route is configured and supplier has linked account
    if (razorpay && supplier?.razorpayAccountId) {
      try {
        const transfer = await razorpay.payments.transfer(order.razorpayPaymentId, {
          transfers: [{
            account: supplier.razorpayAccountId,
            amount: Math.round(supplierAmount * 100), // paise
            currency: 'INR',
            notes: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
              purpose: 'Supplier settlement',
            },
          }],
        });

        order.settlementTransferId = transfer.items?.[0]?.id || transfer.id || 'transfer_done';
        order.settlementStatus = 'settled';
        order.settledAt = new Date();
        await order.save();

        // Update supplier total earnings
        await User.findByIdAndUpdate(supplier._id, {
          $inc: { totalEarnings: supplierAmount, totalOrders: 1 },
        });

        // Notify supplier
        await Notification.create({
          userId: supplier._id,
          type: 'payment',
          title: 'Payment Credited! 💰',
          message: `₹${supplierAmount.toLocaleString('en-IN')} has been transferred to your bank account for order #${order.orderNumber}`,
          data: { orderId: order._id },
        });

        return res.json({
          success: true,
          message: 'Settlement completed',
          settlementAmount: supplierAmount,
          platformCommission: order.platformCommission,
          transferId: order.settlementTransferId,
        });
      } catch (transferErr) {
        console.error('Razorpay transfer failed:', transferErr);
        order.settlementStatus = 'failed';
        await order.save();
        return res.status(500).json({ success: false, message: 'Transfer failed', error: transferErr.message });
      }
    }

    // Demo/manual mode — mark as settled without actual transfer
    order.settlementStatus = 'settled';
    order.settledAt = new Date();
    order.settlementTransferId = 'manual_' + Date.now();
    await order.save();

    // Update supplier total earnings
    if (supplier?._id) {
      await User.findByIdAndUpdate(supplier._id, {
        $inc: { totalEarnings: supplierAmount, totalOrders: 1 },
      });
    }

    // Notify supplier
    if (supplier?._id) {
      await Notification.create({
        userId: supplier._id,
        type: 'payment',
        title: 'Payment Credited! 💰',
        message: `₹${supplierAmount.toLocaleString('en-IN')} settlement processed for order #${order.orderNumber}`,
        data: { orderId: order._id },
      });
    }

    res.json({
      success: true,
      message: 'Settlement marked as complete (manual mode)',
      settlementAmount: supplierAmount,
      platformCommission: order.platformCommission,
    });
  } catch (error) {
    console.error('Settlement error:', error);
    res.status(500).json({ success: false, message: 'Settlement failed', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. REFUND — Cancellation with policy enforcement
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refund', auth, async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Only buyer or admin can request refund
    if (order.buyerId.toString() !== req.user.id && req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ success: false, message: 'Order payment not completed — nothing to refund' });
    }
    if (order.refundStatus === 'full') {
      return res.json({ success: true, message: 'Already fully refunded' });
    }

    // Apply cancellation policy based on event date proximity
    const eventDate = order.items?.[0]?.eventDate || null;
    let refundPercent = 100; // default full refund

    if (eventDate) {
      const hoursToEvent = (new Date(eventDate) - new Date()) / (1000 * 60 * 60);
      if (hoursToEvent <= 48) {
        refundPercent = order.cancellationPolicy?.within48hrs || 50;
      } else {
        refundPercent = order.cancellationPolicy?.before48hrs || 100;
      }
    }

    const refundAmount = Math.round(order.totalAmount * refundPercent / 100);

    // Process refund via Razorpay if configured
    if (razorpay && order.razorpayPaymentId) {
      try {
        const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
          amount: refundAmount * 100, // paise
          notes: {
            orderId: order._id.toString(),
            reason: reason || 'Cancellation',
            refundPercent,
          },
        });

        order.refundId = refund.id;
        order.refundAmount = refundAmount;
        order.refundStatus = refundPercent === 100 ? 'full' : 'partial';
        order.refundedAt = new Date();
        order.paymentStatus = refundPercent === 100 ? 'refunded' : 'paid';
        order.status = 'cancelled';
        await order.save();

        // Notify buyer
        await Notification.create({
          userId: order.buyerId,
          type: 'payment',
          title: 'Refund Processed',
          message: `₹${refundAmount.toLocaleString('en-IN')} refunded for order #${order.orderNumber} (${refundPercent}% as per cancellation policy)`,
          data: { orderId: order._id },
        });

        return res.json({
          success: true,
          message: `Refund of ₹${refundAmount} (${refundPercent}%) processed`,
          refundId: refund.id,
          refundAmount,
          refundPercent,
        });
      } catch (refundErr) {
        console.error('Razorpay refund failed:', refundErr);
        order.refundStatus = 'failed';
        await order.save();
        return res.status(500).json({ success: false, message: 'Refund processing failed', error: refundErr.message });
      }
    }

    // Demo/manual mode
    order.refundAmount = refundAmount;
    order.refundStatus = refundPercent === 100 ? 'full' : 'partial';
    order.refundedAt = new Date();
    order.paymentStatus = refundPercent === 100 ? 'refunded' : 'paid';
    order.status = 'cancelled';
    order.refundId = 'manual_refund_' + Date.now();
    await order.save();

    await Notification.create({
      userId: order.buyerId,
      type: 'payment',
      title: 'Refund Processed',
      message: `₹${refundAmount.toLocaleString('en-IN')} refunded for order #${order.orderNumber}`,
      data: { orderId: order._id },
    });

    res.json({
      success: true,
      message: `Refund of ₹${refundAmount} (${refundPercent}%) processed (manual mode)`,
      refundAmount,
      refundPercent,
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: 'Refund processing failed', error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. WEBHOOK — Razorpay event notifications
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Webhook signature mismatch');
        return res.status(400).json({ message: 'Invalid webhook signature' });
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event: eventType, payload } = event;

    console.log(`📩 Razorpay webhook: ${eventType}`);

    switch (eventType) {
      case 'payment.captured': {
        const payment = payload.payment?.entity;
        if (payment?.notes?.orderId) {
          await Order.findByIdAndUpdate(payment.notes.orderId, {
            paymentStatus: 'paid',
            razorpayPaymentId: payment.id,
            'paymentDetails.paidAt': new Date(),
          });
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payment?.entity;
        if (payment?.notes?.orderId) {
          await Order.findByIdAndUpdate(payment.notes.orderId, {
            paymentStatus: 'failed',
          });
        }
        break;
      }

      case 'transfer.processed': {
        const transfer = payload.transfer?.entity;
        if (transfer?.notes?.orderId) {
          await Order.findByIdAndUpdate(transfer.notes.orderId, {
            settlementStatus: 'settled',
            settlementTransferId: transfer.id,
            settledAt: new Date(),
          });
        }
        break;
      }

      case 'refund.processed': {
        const refund = payload.refund?.entity;
        if (refund?.notes?.orderId) {
          await Order.findByIdAndUpdate(refund.notes.orderId, {
            refundId: refund.id,
            refundedAt: new Date(),
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Razorpay event: ${eventType}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET PAYMENT STATUS — Check payment & settlement status for an order
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('paymentStatus paymentMethod totalAmount settlementStatus settlementAmount platformCommission commissionPercent refundStatus refundAmount razorpayOrderId razorpayPaymentId settledAt refundedAt');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      payment: {
        status: order.paymentStatus,
        method: order.paymentMethod,
        totalAmount: order.totalAmount,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId,
      },
      settlement: {
        status: order.settlementStatus,
        supplierAmount: order.settlementAmount,
        platformCommission: order.platformCommission,
        commissionPercent: order.commissionPercent,
        settledAt: order.settledAt,
      },
      refund: {
        status: order.refundStatus,
        amount: order.refundAmount,
        refundedAt: order.refundedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
