const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: '',
  },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate review per order
reviewSchema.index({ orderId: 1, buyerId: 1 }, { unique: true });

// After saving a review, recompute the vendor's average rating
reviewSchema.post('save', async function () {
  try {
    const Review = mongoose.model('Review');
    const User = mongoose.model('User');
    const agg = await Review.aggregate([
      { $match: { vendorId: this.vendorId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (agg.length) {
      await User.findByIdAndUpdate(this.vendorId, {
        rating: Math.round(agg[0].avg * 10) / 10,
      });
    }
  } catch (err) {
    console.error('Rating aggregation error:', err.message);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
