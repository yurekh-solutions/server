const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema(
  {
    start: { type: String, required: true }, // "HH:MM" 24h
    end: { type: String, required: true },   // "HH:MM" 24h
    reason: { type: String, default: '' },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Date the block applies to. Normalized to 00:00:00 UTC at save-time so
  // (vendorId, date) is stable and unique-indexable.
  date: {
    type: Date,
    required: true,
    index: true,
  },
  blockedSlots: {
    type: [blockedSlotSchema],
    default: [],
  },
  // If true, the whole day is blocked regardless of blockedSlots entries.
  fullyBlocked: {
    type: Boolean,
    default: false,
  },
  // Optional per-equipment block. When empty, the block applies to ALL of
  // this vendor's equipment (entire calendar day).
  equipmentIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Normalize date to 00:00:00 UTC so (vendor, date) pairs compare cleanly.
availabilitySchema.pre('save', function () {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  this.updatedAt = new Date();
});

// One availability document per (vendor, date). Slots live inside it.
availabilitySchema.index({ vendorId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
