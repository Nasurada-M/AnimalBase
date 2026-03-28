const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = require('express').Router();

const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { formatLostPet } = require('../controllers/lostPetController');
const { formatApp } = require('../controllers/applicationController');
const { sendPetFinderAlertEmails } = require('../controllers/authController');
const {
  buildUploadedFilePath,
  buildUploadedFileUrl,
  normalizeStoredAssetUrl,
  resolveStoredAssetUrl,
} = require('../middleware/upload');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({ storage });

const queuePetFinderAlertEmails = (lostPet) => {
  sendPetFinderAlertEmails(lostPet).catch((err) => {
    console.error(
      '[notifications] Failed to queue Pet Finder alert emails from compat route:',
      err instanceof Error ? err.message : err
    );
  });
};

const formatUser = (req, user) => ({
  id: user.id,
  fullName: user.full_name || user.fullName,
  email: user.email,
  phone: user.phone || null,
  address: user.address || null,
  avatarUrl: resolveStoredAssetUrl(req, user.avatar_url || user.avatarUrl || null),
  role: user.role || 'user',
  joinedAt: user.joined_at || user.joinedAt || null,
  createdAt: user.created_at || user.createdAt || null,
});

const optionalAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return next();

    const token = header.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, full_name, email, phone, address, avatar_url, role FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length > 0) req.user = result.rows[0];
  } catch {
    // Ignore invalid optional auth and continue as anonymous.
  }
  next();
};

router.post('/auth/forgot-password', (_req, res) => {
  res.json({
    success: true,
    message: 'If the email is registered, reset instructions will be sent.',
  });
});

router.get('/users/profile', authenticate, (req, res) => {
  res.json({ success: true, user: formatUser(req, req.user) });
});

router.put('/users/profile', authenticate, async (req, res) => {
  try {
    const fullName = req.body.fullName ?? req.body.full_name ?? req.user.full_name;
    const phone = req.body.phone ?? req.body.phone_number ?? req.user.phone;
    const address = req.body.address ?? req.user.address;

    const result = await pool.query(
      `UPDATE users
         SET full_name = $1, phone = $2, address = $3
       WHERE id = $4
       RETURNING id, full_name, email, phone, address, avatar_url, role, joined_at, created_at`,
      [fullName, phone, address, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated.',
      user: formatUser(req, result.rows[0]),
    });
  } catch (err) {
    console.error('compat update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

router.post('/users/profile-photo', authenticate, upload.single('profile_photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded.' });
    }

    const photoPath = buildUploadedFilePath(req.file);
    await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [photoPath, req.user.id]);

    res.json({
      success: true,
      message: 'Profile photo updated.',
      photo_url: buildUploadedFileUrl(req, req.file),
    });
  } catch (err) {
    console.error('compat profile photo error:', err);
    res.status(500).json({ success: false, message: 'Failed to upload photo.' });
  }
});

router.get('/users/my-reports', authenticate, async (req, res) => {
  try {
    const [missingPets, applications] = await Promise.all([
      pool.query(
        'SELECT * FROM lost_pets WHERE reported_by = $1 ORDER BY reported_at DESC',
        [req.user.id]
      ),
      pool.query(
        `SELECT aa.*, p.name as pet_name, p.image_url as pet_image_url, p.type::text as pet_type
           FROM adoption_applications aa
           JOIN pets p ON p.id = aa.pet_id
          WHERE aa.user_id = $1
          ORDER BY aa.submitted_at DESC`,
        [req.user.id]
      ),
    ]);

    res.json({
      success: true,
      missing_pets: missingPets.rows.map((row) => formatLostPet(row, req)),
      applications: applications.rows.map((row) => formatApp(row, req)),
    });
  } catch (err) {
    console.error('compat my reports error:', err);
    res.status(500).json({ success: false, message: 'Failed to load reports.' });
  }
});

router.get('/notifications', (_req, res) => {
  res.json({ success: true, notifications: [], unread_count: 0 });
});

router.put('/notifications/:id/read', (_req, res) => {
  res.json({ success: true, message: 'Notification marked as read.' });
});

router.put('/notifications/read-all', (_req, res) => {
  res.json({ success: true, message: 'All notifications marked as read.' });
});

router.get('/encyclopedia', (_req, res) => {
  res.json({ success: true, animals: [] });
});

router.get('/encyclopedia/:id', (_req, res) => {
  res.json({ success: true, animal: null });
});

router.post('/encyclopedia/favorites/:animalId', (_req, res) => {
  res.json({ success: true, message: 'Favorite saved.' });
});

router.delete('/encyclopedia/favorites/:animalId', (_req, res) => {
  res.json({ success: true, message: 'Favorite removed.' });
});

router.post('/mobile/lost-pets', authenticate, upload.array('photos', 5), async (req, res) => {
  try {
    const imageUrl = buildUploadedFilePath(req.files?.[0]) || normalizeStoredAssetUrl(req.body.imageUrl);

    const petName = req.body.petName;
    const type = req.body.petType;
    const breed = req.body.breed || 'Unknown';
    const gender = req.body.gender || 'Unknown';
    const age = req.body.ageCategory || null;
    const colorAppearance = req.body.colorAppearance || 'Unknown';
    const description = req.body.description || `${petName || 'Pet'} was reported missing from the Android app.`;
    const distinctiveFeatures = req.body.distinctiveFeatures || null;
    const lastSeenLocation = req.body.locationLastSeen;
    const lastSeenDate = req.body.dateLastSeen;
    const rewardOffered = req.body.rewardOffered || null;
    const ownerName = req.user.full_name;
    const ownerEmail = req.body.email || req.user.email;
    const ownerPhone = req.body.contactNumber || req.user.phone || 'N/A';
    const ownerPhone2 = req.body.alternateContact || null;

    if (!petName || !type || !lastSeenLocation || !lastSeenDate || !ownerEmail || !ownerPhone) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const result = await pool.query(
      `INSERT INTO lost_pets
         (pet_name, type, breed, gender, age, color_appearance, description,
          distinctive_features, image_url, last_seen_location, last_seen_date,
          reward_offered, owner_name, owner_email, owner_phone, owner_phone2, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        petName,
        type,
        breed,
        gender,
        age,
        colorAppearance,
        description,
        distinctiveFeatures,
        imageUrl,
        lastSeenLocation,
        lastSeenDate,
        rewardOffered,
        ownerName,
        ownerEmail,
        ownerPhone,
        ownerPhone2,
        req.user.id,
      ]
    );

    const createdLostPet = formatLostPet(result.rows[0], req);
    queuePetFinderAlertEmails(createdLostPet);

    res.status(201).json({
      success: true,
      message: 'Missing pet report submitted.',
      missing_pet: createdLostPet,
    });
  } catch (err) {
    console.error('compat mobile lost pet error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit missing pet report.' });
  }
});

router.post('/mobile/sightings', optionalAuth, upload.array('photos', 5), async (req, res) => {
  try {
    const missingPetId = Number(req.body.missingPetId || 0);
    if (!missingPetId) {
      return res.status(400).json({ success: false, message: 'A missing pet must be selected.' });
    }

    const imageUrl = buildUploadedFilePath(req.files?.[0]) || normalizeStoredAssetUrl(req.body.imageUrl);

    const reporterName =
      req.body.reporterName ||
      req.user?.full_name ||
      'Anonymous Reporter';
    const reporterEmail =
      req.body.reporterEmail ||
      req.user?.email;
    const reporterPhone =
      req.body.reporterPhone ||
      req.user?.phone ||
      'N/A';
    const locationSeen = req.body.location;
    const dateSeen = req.body.sightingDate;
    const description =
      req.body.description ||
      `Reported ${req.body.animalType || 'animal'} sighting from Android app.`;

    if (!reporterEmail || !locationSeen || !dateSeen) {
      return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    await pool.query(
      `INSERT INTO sightings
         (lost_pet_id, reporter_name, reporter_email, reporter_phone,
          location_seen, date_seen, description, image_url, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        missingPetId,
        reporterName,
        reporterEmail,
        reporterPhone,
        locationSeen,
        dateSeen,
        description,
        imageUrl,
        req.user?.id || null,
      ]
    );

    res.status(201).json({ success: true, message: 'Sighting report submitted.' });
  } catch (err) {
    console.error('compat mobile sighting error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit sighting report.' });
  }
});

module.exports = router;
