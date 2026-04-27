const mongoose = require('mongoose');

const counterEntrySchema = new mongoose.Schema({
  from: { type: String, enum: ['buyer', 'vendor'], required: true },
  kind: { type: String, enum: ['message', 'quote', 'counter', 'accept'], default: 'message' },
  text: String,
  price: Number,
  at: { type: Date, default: Date.now },
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  requirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
    required: true,
  },
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
  status: {
    type: String,
    enum: ['pending', 'responded', 'accepted', 'rejected'],
    default: 'pending',
  },
  quotedPrice: Number,
  counterHistory: [counterEntrySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

inquirySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
