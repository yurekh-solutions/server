const mongoose = require('mongoose');

const requirementSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    lat: Number,
    lng: Number,
    address: { type: String, required: true },
    city: String,
  },
  eventType: {
    type: String,
    enum: ['Corporate', 'Wedding', 'Personal', 'Exhibition', 'Concert', 'Conference', 'Other'],
    required: true,
  },
  startAt: Date,
  endAt: Date,
  // Friendly date/time strings from mobile (kept alongside Date fields for easy display)
  date: String,
  startTime: String,
  endTime: String,
  items: [{ type: String }],        // Equipment categories requested
  budget: String,                    // Band e.g. "₹10K-25K", "Flexible"
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'matched', 'booked', 'cancelled'],
    default: 'open',
  },
  offersCount: { type: Number, default: 0 },
  selectedInquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
  selectedVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

requirementSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Requirement', requirementSchema);
