const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Requirement = require('../models/Requirement');
const Inquiry = require('../models/Inquiry');
const Order = require('../models/Order');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/requirements
// @desc    Buyer creates a new requirement
router.post('/', protect, authorize('buyer'), async (req, res) => {
  try {
    const { address, city, eventType, date, startTime, endTime, items, budget, notes, lat, lng } = req.body;

    if (!address || !eventType || !items?.length) {
      return res.status(400).json({ success: false, message: 'address, eventType and items are required' });
    }

    const requirement = await Requirement.create({
      buyerId: req.user.id,
      location: { address, city, lat, lng },
      eventType,
      date,
      startTime,
      endTime,
      items,
      budget,
      notes,
    });

    res.status(201).json({ success: true, requirement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/requirements/me
// @desc    Buyer lists their own requirements
router.get('/me', protect, authorize('buyer'), async (req, res) => {
  try {
    const requirements = await Requirement.find({ buyerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: requirements.length, requirements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/requirements
// @desc    Suppliers browse open buyer requirements (marketplace feed).
//          Supports optional filters: city, eventType, item, status.
router.get('/', protect, authorize('supplier'), async (req, res) => {
  try {
    const { city, eventType, item, status = 'open', limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (city) query['location.city'] = new RegExp(`^${city}$`, 'i');
    if (eventType) query.eventType = eventType;
    if (item) query.items = item;

    const requirements = await Requirement.find(query)
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 })
      .limit(Math.min(200, Number(limit) || 50));

    res.json({ success: true, count: requirements.length, requirements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/requirements/:id
// @desc    Get a single requirement
router.get('/:id', protect, async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) return res.status(404).json({ success: false, message: 'Not found' });

    // Only buyer or admin can view
    if (
      requirement.buyerId.toString() !== req.user.id &&
      req.user.userType !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, requirement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Competitive-bidding endpoints
// ---------------------------------------------------------------------------

// @route   POST /api/requirements/:id/offer
// @desc    Supplier submits a competitive offer on an open requirement
router.post('/:id/offer', protect, authorize('supplier'), async (req, res) => {
  try {
    const { price, note } = req.body;
    if (!price || price <= 0) {
      return res.status(400).json({ success: false, message: 'price is required and must be > 0' });
    }

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Requirement is no longer open for offers' });
    }

    // Prevent duplicate offers
    const existing = await Inquiry.findOne({
      requirementId: req.params.id,
      vendorId: req.user.id,
      status: 'offered',
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already submitted an offer for this requirement' });
    }

    const inquiry = await Inquiry.create({
      requirementId: req.params.id,
      buyerId: requirement.buyerId,
      vendorId: req.user.id,
      offerPrice: price,
      offerNote: note || '',
      status: 'offered',
      isSelected: false,
    });

    // Increment offers count
    requirement.offersCount = (requirement.offersCount || 0) + 1;
    await requirement.save();

    // Notify buyer
    try {
      const supplier = await User.findById(req.user.id).select('name businessName');
      const supplierName = supplier?.businessName || supplier?.name || 'A supplier';
      await Notification.create({
        userId: requirement.buyerId,
        type: 'inquiry',
        title: 'New offer received',
        message: `New offer of \u20B9${price} from ${supplierName}`,
        data: { inquiryId: inquiry._id, requirementId: requirement._id },
      });
    } catch {}

    res.status(201).json({ success: true, message: 'Offer sent', inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/requirements/:id/offers
// @desc    Buyer views all competitive offers on their requirement
router.get('/:id/offers', protect, authorize('buyer'), async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }
    if (requirement.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const offers = await Inquiry.find({
      requirementId: req.params.id,
      status: 'offered',
    })
      .populate('vendorId', 'name businessName rating phone avatar totalOrders')
      .sort({ offerPrice: 1 }); // lowest price first

    res.json({ success: true, offers, requirement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/requirements/:id/select-offer
// @desc    Buyer selects a winning offer. Auto-creates Order + Chat.
router.patch('/:id/select-offer', protect, authorize('buyer'), async (req, res) => {
  try {
    const { inquiryId } = req.body;
    if (!inquiryId) {
      return res.status(400).json({ success: false, message: 'inquiryId is required' });
    }

    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }
    if (requirement.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (requirement.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Requirement is no longer open' });
    }

    const winningInquiry = await Inquiry.findById(inquiryId);
    if (!winningInquiry || winningInquiry.requirementId.toString() !== req.params.id) {
      return res.status(400).json({ success: false, message: 'Invalid inquiry for this requirement' });
    }

    // 1. Update requirement
    requirement.status = 'matched';
    requirement.selectedInquiryId = inquiryId;
    requirement.selectedVendorId = winningInquiry.vendorId;
    await requirement.save();

    // 2. Mark winning inquiry
    winningInquiry.isSelected = true;
    winningInquiry.status = 'accepted';
    await winningInquiry.save();

    // 3. Reject all other offers for this requirement
    const rejectedInquiries = await Inquiry.find({
      requirementId: req.params.id,
      _id: { $ne: inquiryId },
      status: 'offered',
    });
    await Inquiry.updateMany(
      { requirementId: req.params.id, _id: { $ne: inquiryId }, status: 'offered' },
      { $set: { status: 'rejected' } }
    );

    // 4. Auto-create Order + Chat (Order first since Chat requires orderId)
    let order = null;
    let chat = null;
    try {
      order = await Order.create({
        buyerId: winningInquiry.buyerId,
        supplierId: winningInquiry.vendorId,
        items: [],
        totalAmount: winningInquiry.offerPrice || 0,
        paymentMethod: 'manual',
        paymentStatus: 'pending',
        status: 'pending',
        deliveryAddress: {
          street: requirement.location?.address || '',
          city: requirement.location?.city || '',
          state: '',
          pincode: '',
        },
        notes: requirement.notes || '',
        requirementId: requirement._id,
        inquiryId: winningInquiry._id,
      });

      // Auto-generate OTPs for the new order (bidding win = high confidence)
      order.otpStart = String(crypto.randomInt(100000, 999999));
      order.otpEnd = String(crypto.randomInt(100000, 999999));
      await order.save();

      chat = await Chat.create({
        orderId: order._id,
        participants: [winningInquiry.buyerId, winningInquiry.vendorId],
        messages: [
          {
            senderId: winningInquiry.buyerId,
            message: 'Your offer was selected — let\'s finalize details.',
            type: 'system',
          },
        ],
      });

      // Link order back to chat
      order.chatId = chat._id;
      await order.save();
    } catch (e) {
      console.error('Auto-order creation failed:', e.message);
    }

    // 5. Notify winning supplier
    try {
      await Notification.create({
        userId: winningInquiry.vendorId,
        type: 'inquiry',
        title: 'Offer selected!',
        message: 'Your offer was selected! An order has been created.',
        data: { inquiryId: winningInquiry._id, requirementId: requirement._id, orderId: order?._id },
      });
    } catch {}

    // 6. Notify rejected suppliers
    for (const rej of rejectedInquiries) {
      try {
        await Notification.create({
          userId: rej.vendorId,
          type: 'inquiry',
          title: 'Offer not selected',
          message: 'Another offer was selected for this requirement',
          data: { inquiryId: rej._id, requirementId: requirement._id },
        });
      } catch {}
    }

    res.json({
      success: true,
      message: 'Offer selected successfully',
      order: order || null,
      chat: chat || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/requirements/:id/close
// @desc    Buyer closes / cancels a requirement, rejecting all pending offers
router.patch('/:id/close', protect, authorize('buyer'), async (req, res) => {
  try {
    const requirement = await Requirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ success: false, message: 'Requirement not found' });
    }
    if (requirement.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    requirement.status = 'cancelled';
    await requirement.save();

    // Reject all pending / offered inquiries
    const pendingOffers = await Inquiry.find({
      requirementId: req.params.id,
      status: { $in: ['offered', 'pending'] },
    });
    await Inquiry.updateMany(
      { requirementId: req.params.id, status: { $in: ['offered', 'pending'] } },
      { $set: { status: 'rejected' } }
    );

    // Notify each supplier who had offered
    for (const offer of pendingOffers) {
      try {
        await Notification.create({
          userId: offer.vendorId,
          type: 'inquiry',
          title: 'Requirement closed',
          message: 'Requirement closed by buyer',
          data: { inquiryId: offer._id, requirementId: requirement._id },
        });
      } catch {}
    }

    res.json({ success: true, message: 'Requirement closed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
