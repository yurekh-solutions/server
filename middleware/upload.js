// Cloudinary + Multer upload middleware.
// Works with Cloudinary when CLOUDINARY_* env vars are set, otherwise
// falls back to local disk storage under ./uploads so dev still works.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const hasCloudinary =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

let storage;
let cloudinary = null;

if (hasCloudinary) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder = req.uploadFolder || 'urbanav/misc';
      return {
        folder,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
        public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/[^a-z0-9_-]/gi, '_')}`,
      };
    },
  });
  console.log('☁️  Cloudinary upload storage enabled');
} else {
  // Disk fallback for local development without Cloudinary credentials.
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  });
  console.log('💾 Local disk upload storage (no Cloudinary env set)');
}

const fileFilter = (_req, file, cb) => {
  const ok = /^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype);
  if (!ok) return cb(new Error('Only JPG, PNG, and WEBP images are allowed'));
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
});

// ── KYC document uploader (PDF, JPG, PNG) ──────────────────────────────
// Separate storage so Cloudinary uses resource_type 'raw' for PDFs.
let kycStorage;
if (hasCloudinary) {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  kycStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder = `urbanav/kyc/${req.user?._id || 'anon'}`;
      const isPdf = /pdf/i.test(file.mimetype);
      return {
        folder,
        resource_type: isPdf ? 'raw' : 'image',
        public_id: `${Date.now()}-${file.originalname.split('.')[0].replace(/[^a-z0-9_-]/gi, '_')}`,
      };
    },
  });
} else {
  const kycDir = path.join(__dirname, '..', 'uploads', 'kyc');
  if (!fs.existsSync(kycDir)) fs.mkdirSync(kycDir, { recursive: true });
  kycStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, kycDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-z0-9_.-]/gi, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  });
}

const kycFileFilter = (_req, file, cb) => {
  const ok = /^(application\/pdf|image\/(jpeg|jpg|png))$/i.test(file.mimetype);
  if (!ok) return cb(new Error('Only PDF, JPG, or PNG files are allowed for KYC'));
  cb(null, true);
};

const uploadKyc = multer({
  storage: kycStorage,
  fileFilter: kycFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function resolveKycUrl(req, file) {
  if (!file) return null;
  if (file.path && /^https?:\/\//i.test(file.path)) return file.path;
  if (file.secure_url) return file.secure_url;
  const host = `${req.protocol}://${req.get('host')}`;
  return `${host}/uploads/kyc/${file.filename}`;
}

// Helpers for callers that need to tag folder per-route.
function withFolder(folder) {
  return (req, _res, next) => {
    req.uploadFolder = folder;
    next();
  };
}

// Resolve a public URL from an uploaded file object.
// Cloudinary returns .path/.secure_url; disk fallback returns .filename.
function resolveUploadUrl(req, file) {
  if (!file) return null;
  if (file.path && /^https?:\/\//i.test(file.path)) return file.path;
  if (file.secure_url) return file.secure_url;
  // Disk fallback — expose under /uploads static route.
  const host = `${req.protocol}://${req.get('host')}`;
  return `${host}/uploads/${file.filename}`;
}

module.exports = { upload, uploadKyc, resolveKycUrl, withFolder, resolveUploadUrl, cloudinary, hasCloudinary };
