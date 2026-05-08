const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/inquiries
// @desc    Create an inquiry. Buyers target a specific vendor; suppliers quote
//          on a buyer's posted requirement (the supplier becomes the vendor).
router.post('/', protect, async (req, res) => {
  try {
    const { vendorId: vendorIdBody, requirementId, initialPrice, message } = req.body;
    if (!requirementId) {
      return res.status(400).json({ success: false, message: 'requirementId is required' });
    }

    let buyerId, vendorId;
    const Requirement = require('../models/Requirement');

    if (req.user.userType === 'buyer') {
      if (!vendorIdBody) {
        return res.status(400).json({ success: false, message: 'vendorId is required' });
      }
      buyerId = req.user.id;
      vendorId = vendorIdBody;
    } else if (req.user.userType === 'supplier') {
      // Supplier quoting on a buyer's requirement
      const requirement = await Requirement.findById(requirementId).select('buyerId');
      if (!requirement) {
        return res.status(404).json({ success: false, message: 'Requirement not found' });
      }
      buyerId = requirement.buyerId;
      vendorId = req.user.id;
    } else {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const inquiry = await Inquiry.create({
      requirementId,
      buyerId,
      vendorId,
      quotedPrice: initialPrice,
      counterHistory:
        req.user.userType === 'supplier' && (initialPrice || message)
          ? [{ from: 'vendor', kind: 'quote', price: initialPrice, text: message }]
          : [],
      status: req.user.userType === 'supplier' ? 'responded' : 'pending',
    });

    // Notify the other party so it shows up in their inbox.
    try {
      const Notification = require('../models/Notification');
      const recipient = req.user.userType === 'supplier' ? buyerId : vendorId;
      await Notification.create({
        userId: recipient,
        type: 'inquiry',
        title: req.user.userType === 'supplier' ? 'New quote received' : 'New inquiry',
        message:
          req.user.userType === 'supplier'
            ? 'A supplier has quoted on your requirement'
            : 'A buyer has sent you an inquiry',
        data: { inquiryId: inquiry._id },
      });
    } catch {}

    res.status(201).json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/inquiries
// @desc    Get inquiries for a requirement (buyer) or all vendor inquiries (supplier)
router.get('/', protect, async (req, res) => {
  try {
    const { requirementId } = req.query;
    const query =
      req.user.userType === 'buyer'
        ? { buyerId: req.user.id, ...(requirementId ? { requirementId } : {}) }
        : { vendorId: req.user.id };

    const inquiries = await Inquiry.find(query)
      .populate(
        'requirementId',
        'eventType date startAt endAt startTime endTime items budget location notes'
      )
      .populate('buyerId', 'name phone email avatar')
      .populate('vendorId', 'name businessName rating phone avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: inquiries.length, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/inquiries/:id
// @desc    Get a single inquiry with full detail
router.get('/:id', protect, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const inquiry = await Inquiry.findById(req.params.id)
      .populate(
        'requirementId',
        'eventType date startAt endAt startTime endTime items budget location notes'
      )
      .populate('buyerId', 'name phone email avatar')
      .populate('vendorId', 'name businessName rating phone avatar');
    if (!inquiry) return res.status(404).json({ success: false, message: 'Not found' });
    if (
      inquiry.buyerId._id.toString() !== req.user.id &&
      inquiry.vendorId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/inquiries/:id/respond
// @desc    Vendor responds with a quote or counter
router.patch('/:id/respond', protect, authorize('supplier'), async (req, res) => {
  try {
    const { kind = 'quote', price, text, eventStartDate, eventEndDate, deliveryAddress } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (inquiry.vendorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    inquiry.counterHistory.push({ from: 'vendor', kind, price, text });
    inquiry.quotedPrice = price ?? inquiry.quotedPrice;
    if (eventStartDate) inquiry.eventStartDate = eventStartDate;
    if (eventEndDate) inquiry.eventEndDate = eventEndDate;
    if (deliveryAddress) inquiry.quotedDeliveryAddress = deliveryAddress;
    inquiry.status = 'responded';
    await inquiry.save();

    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: inquiry.buyerId,
        type: 'inquiry',
        title: 'New quote received',
        message: price ? `Supplier quoted ₹${price}` : 'Supplier sent you a message',
        data: { inquiryId: inquiry._id },
      });
    } catch {}

    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/inquiries/:id/reject
// @desc    Vendor rejects the inquiry
router.patch('/:id/reject', protect, authorize('supplier'), async (req, res) => {
  try {
    const { reason } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (inquiry.vendorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    inquiry.counterHistory.push({
      from: 'vendor',
      kind: 'message',
      text: reason ? `Rejected: ${reason}` : 'Rejected',
    });
    inquiry.status = 'rejected';
    await inquiry.save();

    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: inquiry.buyerId,
        type: 'inquiry',
        title: 'Inquiry declined',
        message: reason || 'The supplier declined your inquiry',
        data: { inquiryId: inquiry._id },
      });
    } catch {}

    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/inquiries/:id/accept
// @desc    Buyer accepts the latest quote. Auto-creates a draft Order so
//          the buyer can head straight to checkout/chat and the supplier sees
//          it in their Upcoming tab.
router.patch('/:id/accept', protect, authorize('buyer'), async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (inquiry.buyerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    inquiry.counterHistory.push({ from: 'buyer', kind: 'accept', text: 'Quote accepted' });
    inquiry.status = 'accepted';
    await inquiry.save();

    // Auto-create a draft Order referencing this inquiry so the supplier's
    // Orders screen surfaces it immediately under Upcoming. We keep this
    // best-effort: if it fails (e.g. schema validation on missing fields),
    // the accept still succeeds.
    let orderId = null;
    let chatId = null;
    try {
      const Order = require('../models/Order');
      const Chat = require('../models/Chat');
      const Requirement = require('../models/Requirement');
      const Notification = require('../models/Notification');

      const requirement = await Requirement.findById(inquiry.requirementId);

      // Minimal line item derived from the requirement/quote. The buyer can
      // refine it at checkout. equipmentId is required on the schema, so we
      // only create the Order if we have something useful to store.
      const existingOrder = await Order.findOne({ inquiryId: inquiry._id });
      if (!existingOrder) {
        const chat = await Chat.create({
          participants: [inquiry.buyerId, inquiry.vendorId],
          messages: [
            {
              senderId: inquiry.buyerId,
              message: 'Quote accepted — let\'s finalize details.',
              type: 'system',
            },
          ],
        });
        chatId = chat._id;

        const order = await Order.create({
          buyerId: inquiry.buyerId,
          supplierId: inquiry.vendorId,
          items: [],
          totalAmount: inquiry.quotedPrice || 0,
          paymentMethod: 'manual',
          paymentStatus: 'pending',
          status: 'pending',
          deliveryAddress: inquiry.quotedDeliveryAddress || {
            street: requirement?.location?.address || '',
            city: requirement?.location?.city || '',
            state: '',
            pincode: '',
          },
          notes: requirement?.notes || '',
          requirementId: inquiry.requirementId,
          inquiryId: inquiry._id,
          chatId: chat._id,
        });
        orderId = order._id;

        // Link chat back to order
        chat.orderId = order._id;
        await chat.save();

        await Notification.create({
          userId: inquiry.vendorId,
          type: 'order_update',
          title: 'Quote accepted',
          message: `Buyer accepted your quote — Order ${order.orderNumber || ''} created`,
          data: { orderId: order._id, inquiryId: inquiry._id },
        });
      } else {
        orderId = existingOrder._id;
        chatId = existingOrder.chatId;
      }
    } catch (e) {
      // Keep the API response successful even if order creation failed;
      // the supplier can still see the accepted inquiry.
      console.error('Auto-order creation failed:', e.message);
    }

    res.json({ success: true, inquiry, orderId, chatId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
