const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = (subfolder) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_PATH || 'uploads', subfolder);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'), false);
};

const createUploader = (subfolder, maxCount = 5) =>
  multer({
    storage: storage(subfolder),
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 },
  });

const profileUpload = createUploader('profiles').single('profile_photo');
const petPhotosUpload = createUploader('pets').array('photos', 5);
const missingPhotosUpload = createUploader('missing').array('photos', 5);
const sightingPhotosUpload = createUploader('sightings').array('photos', 5);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ success: false, message: 'File too large. Max 10MB.' });
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};

const buildFileUrl = (req, filepath) => {
  if (!filepath) return null;
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/${filepath.replace(/\\/g, '/')}`;
};

module.exports = { profileUpload, petPhotosUpload, missingPhotosUpload, sightingPhotosUpload, handleUploadError, buildFileUrl };
