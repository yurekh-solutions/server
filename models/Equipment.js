const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'projectors', 'led-walls', 'led-tvs', 'sound-systems',
      'microphones', 'dj-equipment', 'cables-accessories',
      'lighting', 'screens', 'video-recording'
    ],
  },
  subcategory: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  basePrice: {
    type: Number,
    required: true,
  },
  minPrice: {
    type: Number,
    required: true,
  },
  maxPrice: {
    type: Number,
    required: true,
  },
  priceUnit: {
    type: String,
    enum: ['hour', 'day', 'event'],
    default: 'day',
  },
  images: [{
    type: String,
    default: [],
  }],
  specs: [{
    type: String,
    default: [],
  }],
  tags: [{
    type: String,
    default: [],
  }],
  availability: {
    type: Boolean,
    default: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  popular: {
    type: Boolean,
    default: false,
  },
  // Stats
  totalBookings: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  // Featured listing (admin controlled)
  isFeatured: {
    type: Boolean,
    default: false,
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Equipment', equipmentSchema);
