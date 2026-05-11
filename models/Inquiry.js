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
    enum: ['pending', 'offered', 'responded', 'accepted', 'rejected'],
    default: 'pending',
  },
  quotedPrice: Number,
  // Optional event window / delivery address captured on the quote so supplier
  // can confirm specifics before buyer accepts. These mirror fields on the
  // requirement but can be edited during negotiation.
  eventStartDate: Date,
  eventEndDate: Date,
  quotedDeliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    instructions: String,
  },
  counterHistory: [counterEntrySchema],
  offerPrice: { type: Number },
  offerNote: { type: String },
  isSelected: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

inquirySchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Inquiry', inquirySchema);
