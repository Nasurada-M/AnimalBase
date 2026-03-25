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

function buildUploadedFileUrl(req, file) {
  if (!file) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
}

module.exports = {
  upload,
  buildUploadedFileUrl,
};
