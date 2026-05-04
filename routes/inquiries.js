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
      .populate('requirementId', 'eventType date items budget')
      .populate('buyerId', 'name')
      .populate('vendorId', 'name businessName rating')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: inquiries.length, inquiries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/inquiries/:id/respond
// @desc    Vendor responds with a quote or counter
router.patch('/:id/respond', protect, authorize('supplier'), async (req, res) => {
  try {
    const { kind = 'quote', price, text } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    if (inquiry.vendorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    inquiry.counterHistory.push({ from: 'vendor', kind, price, text });
    inquiry.quotedPrice = price ?? inquiry.quotedPrice;
    inquiry.status = 'responded';
    await inquiry.save();

    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   PATCH /api/inquiries/:id/accept
// @desc    Buyer accepts the latest quote
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

    res.json({ success: true, inquiry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
