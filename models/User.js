const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['buyer', 'supplier', 'admin'],
    required: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  avatarPublicId: {
    type: String,
    default: '',
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' },
  },
  // Multiple saved addresses for delivery / pickup.
  addresses: [
    {
      label: { type: String, default: 'Home' },
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
      phone: { type: String, default: '' },
      isDefault: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // User notification preferences (push / email / SMS channels).
  notificationPrefs: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    orderUpdates: { type: Boolean, default: true },
    inquiryUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
  },
  // Supplier specific fields
  businessName: {
    type: String,
    required: function() { return this.userType === 'supplier'; },
  },
  businessDescription: String,
  gstNumber: String,
  
  // Verification & Status
  isVerified: {
    type: Boolean,
    default: false,
  },
  // Admin-controlled account state (separate from isVerified which tracks OTP).
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active',
  },
  verificationOTP: String,
  verificationOTPExpires: Date,
  resetOTP: String,
  resetOTPExpires: Date,
  
  // Rating & Stats
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalEarnings: {
    type: Number,
    default: 0,
  },
  
  // Push Notifications
  fcmToken: String,
  
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

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
