const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const {
  upload,
  withFolder,
  resolveUploadUrl,
  cloudinary,
  hasCloudinary,
} = require('../middleware/upload');

// @route   POST /api/upload/avatar
// @desc    Upload authenticated user's avatar image (Cloudinary or disk)
router.post(
  '/avatar',
  protect,
  withFolder(`urbanav/avatars/${'placeholder'}`), // overwritten below per-request
  (req, _res, next) => {
    req.uploadFolder = `urbanav/avatars/${req.user?._id || 'anon'}`;
    next();
  },
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: 'No file uploaded' });
      }

      console.log('📤 Upload received:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        hasCloudinary: !!req.file.path || !!req.file.secure_url,
      });

      const url = resolveUploadUrl(req, req.file);
      if (!url) {
        return res
          .status(500)
          .json({ success: false, message: 'Upload failed - no URL generated' });
      }

      console.log('✅ Upload URL generated:', url);

      // Best-effort delete of previous Cloudinary avatar to save storage.
      if (hasCloudinary && cloudinary && req.user?.avatarPublicId) {
        cloudinary.uploader
          .destroy(req.user.avatarPublicId)
          .catch((err) => console.log('⚠️ Failed to delete old avatar:', err.message));
      }

      const publicId = req.file.filename || req.file.public_id || null;
      await User.findByIdAndUpdate(req.user._id, {
        avatar: url,
        avatarPublicId: publicId,
      });

      console.log('✅ Avatar updated in database');
      res.json({ success: true, url, publicId });
    } catch (err) {
      console.error('❌ Upload error:', err);
      console.error('   Stack:', err.stack);
      res
        .status(500)
        .json({ success: false, message: err.message || 'Upload error' });
    }
  }
);

// @route   POST /api/upload/image
// @desc    Generic single image upload (for equipment, chat, etc.)
router.post(
  '/image',
  protect,
  (req, _res, next) => {
    req.uploadFolder = `urbanav/${req.body.folder || 'misc'}`;
    next();
  },
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: 'No file uploaded' });
    }
    const url = resolveUploadUrl(req, req.file);
    res.json({
      success: true,
      url,
      publicId: req.file.filename || req.file.public_id || null,
    });
  }
);

// @route   POST /api/upload/images
// @desc    Multiple image upload (equipment gallery, etc.) - max 8
router.post(
  '/images',
  protect,
  (req, _res, next) => {
    req.uploadFolder = `urbanav/${req.body.folder || 'gallery'}`;
    next();
  },
  upload.array('files', 8),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map((f) => ({
      url: resolveUploadUrl(req, f),
      publicId: f.filename || f.public_id || null,
    }));
    res.json({ success: true, files: urls });
  }
);

module.exports = router;
