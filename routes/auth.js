const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadKyc, resolveKycUrl } = require('../middleware/upload');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// @route   POST /api/auth/register
// @desc    Register a new user (buyer or supplier)
router.post('/register', async (req, res) => {
  try {
    const { email, password, phone, name, userType, businessName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const isSupplier = userType === 'supplier';
    const user = await User.create({
      email,
      password,
      phone,
      name,
      userType,
      businessName: isSupplier ? businessName : undefined,
      isVerified: false,
      accountStatus: isSupplier ? 'pending' : 'active',
      kycStatus: isSupplier ? 'pending' : undefined,
      verificationOTP: generateOTP(),
      verificationOTPExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // TODO: Send verification email with OTP
    console.log('Verification OTP:', user.verificationOTP);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        businessName: user.businessName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Demo credentials fallback (read from env — admin testing only)
    const isDemoBuyer =
      email === process.env.DEMO_BUYER_EMAIL &&
      password === process.env.DEMO_BUYER_PASSWORD;
    const isDemoSupplier =
      email === process.env.DEMO_SUPPLIER_EMAIL &&
      password === process.env.DEMO_SUPPLIER_PASSWORD;

    if (isDemoBuyer) {
      const demoUser = {
        id: 'demo-buyer-id',
        name: 'Demo Buyer',
        email: process.env.DEMO_BUYER_EMAIL,
        userType: 'buyer',
        isVerified: true,
      };
      const token = jwt.sign({ id: demoUser.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({ success: true, token, user: demoUser });
    }
    if (isDemoSupplier) {
      const demoUser = {
        id: 'demo-supplier-id',
        name: 'Demo Supplier',
        email: process.env.DEMO_SUPPLIER_EMAIL,
        userType: 'supplier',
        isVerified: true,
      };
      const token = jwt.sign({ id: demoUser.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      return res.json({ success: true, token, user: demoUser });
    }

    // Check for user in database
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Block unapproved suppliers from logging in
    if (user.userType === 'supplier') {
      if (user.accountStatus === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. Please complete KYC and wait for verification.',
          code: 'ACCOUNT_PENDING',
        });
      }
      if (user.accountStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been rejected. Contact support for more information.',
          code: 'ACCOUNT_REJECTED',
        });
      }
      if (user.accountStatus === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Contact support.',
          code: 'ACCOUNT_SUSPENDED',
        });
      }
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        avatar: user.avatar,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        businessName: user.businessName,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/kyc-document
// @desc    Upload KYC document (PDF/image) for suppliers
router.post('/kyc-document', protect, uploadKyc.single('document'), async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== 'supplier') {
      return res.status(400).json({ success: false, message: 'Only suppliers can upload KYC documents' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No document uploaded' });
    }
    const url = resolveKycUrl(req, req.file);
    const kycDocument = {
      url,
      publicId: req.file.filename || req.file.public_id || '',
      filename: req.file.originalname || req.file.filename || '',
      mimeType: req.file.mimetype || '',
      size: req.file.size || 0,
      uploadedAt: new Date(),
    };
    const updated = await User.findByIdAndUpdate(
      user.id,
      {
        $set: {
          kycDocument,
          kycStatus: 'submitted',
          kycSubmittedAt: new Date(),
        },
      },
      { new: true }
    );
    res.json({
      success: true,
      message: 'KYC document uploaded. Awaiting admin review.',
      kycDocument,
      kycStatus: updated.kycStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Upload error' });
  }
});

// @route   POST /api/auth/kyc-documents
// @desc    Upload multi-slot KYC documents (PAN/Aadhaar/BankProof/GST)
//          along with business description, products offered, years in
//          business. Admin reviews each document separately before
//          approving the vendor account.
const kycDocsFields = uploadKyc.fields([
  { name: 'pan', maxCount: 1 },
  { name: 'aadhaar', maxCount: 1 },
  { name: 'bankProof', maxCount: 1 },
  { name: 'gst', maxCount: 1 },
]);

router.post('/kyc-documents', protect, kycDocsFields, async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== 'supplier') {
      return res.status(400).json({ success: false, message: 'Only suppliers can upload KYC documents' });
    }

    const files = req.files || {};
    const buildDoc = (file) => {
      if (!file) return null;
      return {
        url: resolveKycUrl(req, file),
        publicId: file.filename || file.public_id || '',
        filename: file.originalname || file.filename || '',
        mimeType: file.mimetype || '',
        size: file.size || 0,
        uploadedAt: new Date(),
      };
    };

    const existing = await User.findById(user.id).select('kycDocuments');
    const current = (existing && existing.kycDocuments) || {};
    const kycDocuments = {
      pan: buildDoc(files.pan && files.pan[0]) || current.pan || undefined,
      aadhaar: buildDoc(files.aadhaar && files.aadhaar[0]) || current.aadhaar || undefined,
      bankProof: buildDoc(files.bankProof && files.bankProof[0]) || current.bankProof || undefined,
      gst: buildDoc(files.gst && files.gst[0]) || current.gst || undefined,
    };

    // Required: PAN + BankProof (aadhaar optional, gst recommended).
    if (!kycDocuments.pan || !kycDocuments.pan.url) {
      return res.status(400).json({ success: false, message: 'PAN Card is required.' });
    }
    if (!kycDocuments.bankProof || !kycDocuments.bankProof.url) {
      return res.status(400).json({ success: false, message: 'Bank Proof is required.' });
    }

    // Parse business detail fields from multipart body.
    const {
      businessName,
      businessDescription,
      productsOffered,
      yearsInBusiness,
      gstNumber,
      panNumber,
    } = req.body || {};

    let productsList = [];
    if (Array.isArray(productsOffered)) productsList = productsOffered;
    else if (typeof productsOffered === 'string' && productsOffered.length) {
      try {
        const parsed = JSON.parse(productsOffered);
        productsList = Array.isArray(parsed)
          ? parsed
          : productsOffered.split(',').map((s) => s.trim()).filter(Boolean);
      } catch {
        productsList = productsOffered.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const updates = {
      kycDocuments,
      kycStatus: 'submitted',
      kycSubmittedAt: new Date(),
      // Mirror the primary document (PAN) into legacy kycDocument for old admin views.
      kycDocument: kycDocuments.pan,
    };
    if (businessName !== undefined) updates.businessName = businessName;
    if (businessDescription !== undefined) updates.businessDescription = businessDescription;
    if (productsList.length) updates.productsOffered = productsList;
    if (yearsInBusiness !== undefined && yearsInBusiness !== '') {
      const y = Number(yearsInBusiness);
      if (!Number.isNaN(y)) updates.yearsInBusiness = y;
    }
    if (gstNumber !== undefined) updates.gstNumber = gstNumber;
    if (panNumber !== undefined) updates.panNumber = panNumber;

    const updated = await User.findByIdAndUpdate(
      user.id,
      { $set: updates },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'KYC documents uploaded. Awaiting admin review.',
      kycDocuments: updated.kycDocuments,
      kycStatus: updated.kycStatus,
      businessDescription: updated.businessDescription,
      productsOffered: updated.productsOffered,
      yearsInBusiness: updated.yearsInBusiness,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Upload error' });
  }
});

// @route   PUT /api/auth/kyc
// @desc    Submit/update KYC details (suppliers only)
router.put('/kyc', protect, async (req, res) => {
  try {
    const user = req.user;

    if (user.userType !== 'supplier') {
      return res.status(400).json({
        success: false,
        message: 'KYC is only required for suppliers',
      });
    }

    const {
      gstNumber, panNumber, serviceArea, bankDetails,
    } = req.body;

    const updates = {};
    if (gstNumber !== undefined) updates.gstNumber = gstNumber;
    if (panNumber !== undefined) updates.panNumber = panNumber;
    if (serviceArea) {
      updates.serviceArea = {
        city: serviceArea.city || '',
        state: serviceArea.state || '',
        pincode: serviceArea.pincode || '',
        fullAddress: serviceArea.fullAddress || '',
      };
    }
    if (bankDetails) {
      updates.bankDetails = {
        accountNumber: bankDetails.accountNumber || '',
        ifsc: bankDetails.ifsc || '',
        bankName: bankDetails.bankName || '',
        accountHolderName: bankDetails.accountHolderName || '',
      };
    }

    updates.kycStatus = 'submitted';
    updates.kycSubmittedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'KYC details submitted successfully. Your application is under review.',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        userType: updatedUser.userType,
        accountStatus: updatedUser.accountStatus,
        kycStatus: updatedUser.kycStatus,
        gstNumber: updatedUser.gstNumber,
        panNumber: updatedUser.panNumber,
        serviceArea: updatedUser.serviceArea,
        bankDetails: updatedUser.bankDetails,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during KYC submission',
      error: error.message,
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        avatar: user.avatar,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus,
        isVerified: user.isVerified,
        businessName: user.businessName,
        businessDescription: user.businessDescription,
        gstNumber: user.gstNumber,
        panNumber: user.panNumber,
        serviceArea: user.serviceArea,
        bankDetails: user.bankDetails,
        rating: user.rating,
        isFeatured: user.isFeatured,
        commissionRate: user.commissionRate,
        isFraudFlagged: user.isFraudFlagged,
        fraudNotes: user.fraudNotes,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone, avatar, address } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (address) updates.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, user: { id: user._id, name: user.name, phone: user.phone, avatar: user.avatar } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send OTP for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    user.resetOTP = otp;
    user.resetOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // TODO: Send OTP via email
    console.log('Reset OTP:', otp);

    res.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and reset password
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetOTP: otp,
      resetOTPExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Update password
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

// @route   PUT /api/auth/update-profile  (and /api/auth/profile)
// @desc    Update user profile
const updateProfileHandler = async (req, res) => {
  try {
    const {
      name,
      phone,
      avatar,
      avatarPublicId,
      address,
      businessName,
      businessDescription,
      notificationPrefs,
    } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (avatar !== undefined) update.avatar = avatar;
    if (avatarPublicId !== undefined) update.avatarPublicId = avatarPublicId;
    if (address !== undefined) update.address = address;
    if (businessName !== undefined) update.businessName = businessName;
    if (businessDescription !== undefined) update.businessDescription = businessDescription;
    if (notificationPrefs !== undefined) {
      // Merge rather than overwrite, so a partial toggle works.
      const existing = (await User.findById(req.user.id).select('notificationPrefs'))?.notificationPrefs || {};
      update.notificationPrefs = { ...existing.toObject?.() ?? existing, ...notificationPrefs };
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

router.put('/update-profile', protect, updateProfileHandler);
router.put('/profile', protect, updateProfileHandler);

// @route   POST /api/auth/fcm-token
// @desc    Register FCM token for push notifications
router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    await User.findByIdAndUpdate(req.user.id, { fcmToken });

    res.json({
      success: true,
      message: 'FCM token registered',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

module.exports = router;
