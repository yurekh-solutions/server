const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/addresses
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json({ success: true, addresses: user?.addresses || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/addresses
router.post('/', protect, async (req, res) => {
  try {
    const {
      label = 'Home',
      line1,
      line2 = '',
      city,
      state,
      pincode,
      country = 'India',
      phone = '',
      isDefault = false,
    } = req.body || {};

    if (!line1 || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'line1, city, state, pincode are required',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (isDefault) {
      (user.addresses || []).forEach((a) => (a.isDefault = false));
    }
    const entry = {
      _id: new mongoose.Types.ObjectId(),
      label,
      line1,
      line2,
      city,
      state,
      pincode,
      country,
      phone,
      isDefault: isDefault || !(user.addresses && user.addresses.length),
    };
    user.addresses = [...(user.addresses || []), entry];
    await user.save();
    res.status(201).json({ success: true, address: entry, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/addresses/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const addr = (user.addresses || []).find((a) => String(a._id) === String(req.params.id));
    if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });

    const updatable = ['label', 'line1', 'line2', 'city', 'state', 'pincode', 'country', 'phone'];
    updatable.forEach((k) => {
      if (k in req.body) addr[k] = req.body[k];
    });
    if (req.body.isDefault === true) {
      user.addresses.forEach((a) => {
        a.isDefault = String(a._id) === String(req.params.id);
      });
    }
    await user.save();
    res.json({ success: true, address: addr, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/addresses/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const before = (user.addresses || []).length;
    user.addresses = (user.addresses || []).filter((a) => String(a._id) !== String(req.params.id));
    if (user.addresses.length === before) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    // If we deleted the default, promote the first remaining one.
    if (user.addresses.length && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   PUT /api/addresses/:id/default
router.put('/:id/default', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    let found = false;
    (user.addresses || []).forEach((a) => {
      if (String(a._id) === String(req.params.id)) {
        a.isDefault = true;
        found = true;
      } else {
        a.isDefault = false;
      }
    });
    if (!found) return res.status(404).json({ success: false, message: 'Address not found' });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
