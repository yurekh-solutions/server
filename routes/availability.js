const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Availability = require('../models/Availability');
const { protect } = require('../middleware/auth');

// Normalize a date-ish input to midnight UTC.
function normalizeDay(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// @route   GET /api/availability
// @desc    Public: buyers/anyone can check a vendor's blocked dates in a range
// @query   vendorId (required), from (ISO date), to (ISO date)
router.get('/', async (req, res) => {
  try {
    const { vendorId, from, to } = req.query;
    if (!vendorId || !mongoose.isValidObjectId(vendorId)) {
      return res.status(400).json({ success: false, message: 'vendorId required' });
    }
    const q = { vendorId };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = normalizeDay(from);
      if (to) q.date.$lte = normalizeDay(to);
    }
    const entries = await Availability.find(q).sort({ date: 1 });
    res.json({ success: true, count: entries.length, availability: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/availability/me
// @desc    Supplier's own blocked calendar
router.get('/me', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const q = { vendorId: req.user.id };
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = normalizeDay(from);
      if (to) q.date.$lte = normalizeDay(to);
    }
    const entries = await Availability.find(q).sort({ date: 1 });
    res.json({ success: true, count: entries.length, availability: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/availability
// @desc    Supplier blocks a date/slot. Upserts (vendorId, date).
// @body    { date, blockedSlots?, fullyBlocked?, equipmentIds? }
router.post('/', protect, async (req, res) => {
  try {
    const { date, blockedSlots, fullyBlocked, equipmentIds } = req.body;
    const day = normalizeDay(date);
    if (!day) return res.status(400).json({ success: false, message: 'Valid date required' });

    const existing = await Availability.findOne({ vendorId: req.user.id, date: day });
    if (existing) {
      if (Array.isArray(blockedSlots) && blockedSlots.length) {
        existing.blockedSlots.push(...blockedSlots);
      }
      if (typeof fullyBlocked === 'boolean') existing.fullyBlocked = fullyBlocked;
      if (Array.isArray(equipmentIds)) existing.equipmentIds = equipmentIds;
      await existing.save();
      return res.json({ success: true, availability: existing });
    }

    const entry = await Availability.create({
      vendorId: req.user.id,
      date: day,
      blockedSlots: Array.isArray(blockedSlots) ? blockedSlots : [],
      fullyBlocked: !!fullyBlocked,
      equipmentIds: Array.isArray(equipmentIds) ? equipmentIds : [],
    });
    res.status(201).json({ success: true, availability: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/availability/:id
// @desc    Supplier unblocks a whole date (removes the doc).
router.delete('/:id', protect, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }
    const entry = await Availability.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
    if (entry.vendorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await entry.deleteOne();
    res.json({ success: true, message: 'Unblocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
