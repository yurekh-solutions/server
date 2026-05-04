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
    default: '',
    trim: true,
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
  businessDescription: { type: String, default: '' },
  // Products / services the supplier offers (free-form list).
  productsOffered: { type: [String], default: [] },
  // Years the business has been operating.
  yearsInBusiness: { type: Number, default: 0 },
  gstNumber: {
    type: String,
    default: '',
  },
  panNumber: {
    type: String,
    default: '',
  },
  // Service area for suppliers
  serviceArea: {
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    fullAddress: { type: String, default: '' },
  },
  // Bank details for payouts
  bankDetails: {
    accountNumber: { type: String, default: '' },
    ifsc: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
  },
  // KYC Status
  kycStatus: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending',
  },
  // Uploaded KYC document (PDF) — legacy single-file slot, kept for
  // backward-compat with earlier mobile clients.
  kycDocument: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: Date,
  },
  // Multi-document KYC: PAN (required), Aadhaar (optional),
  // Bank Proof (required), GST/Business licence (recommended).
  // Admin reviews each slot individually before approving the vendor.
  kycDocuments: {
    pan: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      filename: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: Date,
    },
    aadhaar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      filename: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: Date,
    },
    bankProof: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      filename: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: Date,
    },
    gst: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      filename: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      size: { type: Number, default: 0 },
      uploadedAt: Date,
    },
  },
  kycSubmittedAt: Date,
  kycApprovedAt: Date,
  kycRejectedAt: Date,
  kycReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kycRejectionReason: String,
  // Admin-controlled account state (separate from isVerified which tracks OTP).
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'pending', 'rejected'],
    default: function() {
      return this.userType === 'supplier' ? 'pending' : 'active';
    },
  },
  verificationOTP: String,
  verificationOTPExpires: Date,
  resetOTP: String,
  resetOTPExpires: Date,
  
  // Featured / commission
  isFeatured: {
    type: Boolean,
    default: false,
  },
  commissionRate: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
  },
  // Fraud flags
  isFraudFlagged: {
    type: Boolean,
    default: false,
  },
  fraudNotes: {
    type: String,
    default: '',
  },
  fraudFlaggedAt: Date,
  // Push Notifications
  fcmToken: String,

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
