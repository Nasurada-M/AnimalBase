const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `animalbase-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      req.fileValidationError = 'Only image uploads are allowed.';
      return cb(null, false);
    }

    cb(null, true);
  },
});

function getRequestOrigin(req) {
  if (!req || typeof req.get !== 'function') return null;

  const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = forwardedHost || req.get('host');

  if (!protocol || !host) return null;
  return `${protocol}://${host}`;
}

function buildUploadedFilePath(file) {
  if (!file) return null;
  return `/uploads/${file.filename}`;
}

function normalizeStoredAssetUrl(value) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return null;

  if (normalized.toLowerCase().startsWith('data:image/')) {
    return normalized;
  }

  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }

  if (normalized.startsWith('uploads/')) {
    return `/${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    return normalized;
  }

  return normalized;
}

function resolveStoredAssetUrl(req, value) {
  const normalized = normalizeStoredAssetUrl(value);
  if (!normalized) return null;

  if (normalized.startsWith('/uploads/')) {
    const origin = getRequestOrigin(req);
    return origin ? `${origin}${normalized}` : normalized;
  }

  return normalized;
}

function buildUploadedFileUrl(req, file) {
  return resolveStoredAssetUrl(req, buildUploadedFilePath(file));
}

module.exports = {
  upload,
  buildUploadedFilePath,
  buildUploadedFileUrl,
  getRequestOrigin,
  normalizeStoredAssetUrl,
  resolveStoredAssetUrl,
};
