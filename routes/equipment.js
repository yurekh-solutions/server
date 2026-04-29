const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');
const { protect, authorize } = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// @route   GET /api/equipment
// @desc    Get all equipment with filters
router.get('/', async (req, res) => {
  try {
    const { category, subcategory, search, minPrice, maxPrice, popular } = req.query;
    
    let query = {};
    
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (popular === 'true') query.popular = true;
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const equipment = await Equipment.find(query)
      .populate('supplierId', 'name businessName rating')
      .sort({ popular: -1, createdAt: -1 });

    res.json({
      success: true,
      count: equipment.length,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/equipment/mine
// @desc    Get equipment owned by the logged-in supplier
// NOTE: must be registered BEFORE '/:id' so 'mine' is not captured as an id.
router.get('/mine', protect, authorize('supplier'), async (req, res) => {
  try {
    const items = await Equipment.find({ supplierId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: items.length, equipment: items });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/equipment/:id
// @desc    Get single equipment
router.get('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id)
      .populate('supplierId', 'name businessName phone rating avatar');

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    res.json({
      success: true,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/equipment
// @desc    Add new equipment (Supplier only)
router.post('/', protect, authorize('supplier'), async (req, res) => {
  try {
    req.body.supplierId = req.user.id;

    const equipment = await Equipment.create(req.body);

    res.status(201).json({
      success: true,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/equipment/:id
// @desc    Update equipment (Supplier only - own equipment)
router.put('/:id', protect, authorize('supplier'), async (req, res) => {
  try {
    let equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    // Make sure user owns the equipment
    if (equipment.supplierId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this equipment',
      });
    }

    equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   DELETE /api/equipment/:id
// @desc    Delete equipment (Supplier only - own equipment)
router.delete('/:id', protect, authorize('supplier'), async (req, res) => {
  try {
    const equipment = await Equipment.findById(req.params.id);

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found',
      });
    }

    // Make sure user owns the equipment
    if (equipment.supplierId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this equipment',
      });
    }

    await equipment.deleteOne();

    res.json({
      success: true,
      message: 'Equipment removed',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/equipment/supplier/my-equipment
// @desc    Get supplier's own equipment
router.get('/supplier/my-equipment', protect, authorize('supplier'), async (req, res) => {
  try {
    const equipment = await Equipment.find({ supplierId: req.user.id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: equipment.length,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/equipment/supplier/:supplierId
// @desc    Get specific supplier's equipment
router.get('/supplier/:supplierId', async (req, res) => {
  try {
    const equipment = await Equipment.find({ supplierId: req.params.supplierId })
      .populate('supplierId', 'name businessName rating')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: equipment.length,
      equipment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/equipment/categories
// @desc    Get all categories with counts
router.get('/stats/categories', async (req, res) => {
  try {
    const categories = await Equipment.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$basePrice' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          avgPrice: { $round: ['$avgPrice', 0] },
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/equipment/:id/featured
// @desc    Toggle featured status (admin only)
router.put('/:id/featured', adminAuth, async (req, res) => {
  try {
    const { featured } = req.body;
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { $set: { isFeatured: !!featured } },
      { new: true }
    );
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found' });
    }
    res.json({ success: true, message: featured ? 'Featured' : 'Unfeatured', equipment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
