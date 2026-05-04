const express = require('express');
const router = express.Router();
const Requirement = require('../models/Requirement');
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

module.exports = router;
