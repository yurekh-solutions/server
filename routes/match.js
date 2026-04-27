const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Equipment = require('../models/Equipment');
const Requirement = require('../models/Requirement');
const { protect } = require('../middleware/auth');

/** Haversine distance in km between two lat/lng points */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Normalise a value within [0,max] to [0,1], lower=better for distance/price/responseTime */
const norm = (v, max, lowerBetter = true) => {
  const clamped = Math.min(v, max) / max;
  return lowerBetter ? 1 - clamped : clamped;
};

// @route   GET /api/match?requirementId=
// @desc    Return ranked supplier list matching a requirement
//          Score = 0.3*distanceScore + 0.3*ratingScore + 0.2*priceScore + 0.2*responseScore
router.get('/', protect, async (req, res) => {
  try {
    const { requirementId } = req.query;
    if (!requirementId) {
      return res.status(400).json({ success: false, message: 'requirementId is required' });
    }

    const requirement = await Requirement.findById(requirementId);
    if (!requirement) return res.status(404).json({ success: false, message: 'Requirement not found' });

    // Get all active suppliers
    const suppliers = await User.find({ userType: 'supplier' }).select(
      'name businessName rating totalOrders address'
    );

    const buyerLat = requirement.location?.lat;
    const buyerLng = requirement.location?.lng;

    const scored = suppliers.map((s) => {
      const sLat = s.address?.lat;
      const sLng = s.address?.lng;

      let distanceKm = 10; // city fallback
      let mocked = true;

      if (buyerLat && buyerLng && sLat && sLng) {
        distanceKm = haversine(buyerLat, buyerLng, sLat, sLng);
        mocked = false;
      }

      const rating = s.rating || 3.5;
      const responseTimeMins = 15; // placeholder until Phase B adds this field
      const estimatedPrice = 25000;  // placeholder until supplier sets pricing

      const distScore = norm(distanceKm, 50);
      const ratingScore = norm(rating, 5, false); // higher = better
      const priceScore = norm(estimatedPrice, 100000);
      const responseScore = norm(responseTimeMins, 120);

      const score = 0.3 * distScore + 0.3 * ratingScore + 0.2 * priceScore + 0.2 * responseScore;

      return {
        id: s._id,
        name: s.name,
        businessName: s.businessName || s.name,
        rating,
        totalOrders: s.totalOrders || 0,
        distanceKm: Math.round(distanceKm * 10) / 10,
        responseTimeMins,
        estimatedPrice,
        score: Math.round(score * 100) / 100,
        mocked,
      };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);

    res.json({ success: true, count: sorted.length, matches: sorted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
