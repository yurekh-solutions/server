const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [{
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },
    name: String,
    image: String,
    quantity: {
      type: Number,
      default: 1,
    },
    pricePerUnit: Number,
    totalPrice: Number,
    eventDate: Date,
    returnDate: Date,
  }],
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
  },
  // Payment
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'razorpay', 'manual', 'cash', 'upi'],
    default: 'manual',
  },
  paymentDetails: {
    stripePaymentId: String,
    transactionId: String,
    paidAt: Date,
  },
  // Delivery
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    instructions: String,
  },
  // Communication
  notes: {
    type: String,
    default: '',
  },
  supplierNotes: {
    type: String,
    default: '',
  },
  // Advance payment (OTP trust layer)
  advanceAmount: { type: Number, default: 0 },
  advancePaid: { type: Boolean, default: false },
  balanceDue: { type: Number, default: 0 },

  // OTP lifecycle
  otpStart: String,             // 6-digit, buyer shares with supplier at event start
  otpEnd: String,               // 6-digit, buyer shares with supplier at event end
  otpStartVerified: { type: Boolean, default: false },
  otpEndVerified: { type: Boolean, default: false },

  // References to new marketplace models
  requirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Requirement',
  },
  inquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inquiry',
  },

  // Chat
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
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

// Generate order number before saving
orderSchema.pre('save', async function() {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `URB-${String(count + 1).padStart(6, '0')}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
