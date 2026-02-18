const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { sightingPhotosUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { validate } = require('../middleware/validation');
const { sendPushNotification } = require('../config/firebase');

// POST /api/sightings
router.post('/', (req, res, next) => {
  sightingPhotosUpload(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, [
  body('reporter_email').isEmail().normalizeEmail().withMessage('Valid reporter email required'),
  body('sighting_date').isDate().withMessage('Valid sighting date required (YYYY-MM-DD)'),
  body('location').trim().notEmpty().withMessage('Sighting location required'),
  body('animal_type').notEmpty().withMessage('Animal type required'),
  validate,
], async (req, res) => {
  try {
    const { missing_pet_id, reporter_name, reporter_email, reporter_phone, alternate_phone,
            animal_type, breed, gender, age_category, size, color_appearance, description,
            sighting_date, location, latitude, longitude, is_unidentified } = req.body;
    const photos = req.files ? req.files.map(f => `uploads/sightings/${f.filename}`) : [];
    const result = await db.query(
      `INSERT INTO sighting_reports (missing_pet_id, reporter_name, reporter_email, reporter_phone,
        alternate_phone, animal_type, breed, gender, age_category, size, color_appearance,
        description, sighting_date, location, latitude, longitude, photos, is_unidentified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [missing_pet_id || null, reporter_name, reporter_email, reporter_phone, alternate_phone,
       animal_type, breed, gender, age_category, size, color_appearance, description,
       sighting_date, location, latitude || null, longitude || null, photos,
       is_unidentified === 'true' || is_unidentified === true]
    );
    // Notify missing pet owner if linked
    if (missing_pet_id) {
      const petInfo = await db.query(
        `SELECT mp.user_id, mp.pet_name, u.push_notifications FROM missing_pets mp
         JOIN users u ON mp.user_id = u.user_id WHERE mp.missing_pet_id = $1`,
        [missing_pet_id]
      );
      if (petInfo.rows.length > 0) {
        const owner = petInfo.rows[0];
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, related_id)
           VALUES ($1, 'new_sighting', $2, $3, $4)`,
          [owner.user_id, 'New Sighting Report!',
           `Someone spotted a pet matching your missing ${petInfo.rows[0].pet_name}! Location: ${location}`,
           missing_pet_id]
        );
      }
    }
    res.status(201).json({ success: true, message: 'Sighting report submitted', sighting: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/sightings
router.get('/', async (req, res) => {
  try {
    const { missing_pet_id, limit = 20, offset = 0 } = req.query;
    let whereClause = missing_pet_id ? `WHERE sr.missing_pet_id = ${parseInt(missing_pet_id)}` : '';
    const result = await db.query(
      `SELECT sr.*, mp.pet_name FROM sighting_reports sr
       LEFT JOIN missing_pets mp ON sr.missing_pet_id = mp.missing_pet_id
       ${whereClause} ORDER BY sr.created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    const sightings = result.rows.map(s => ({
      ...s,
      photo_urls: Array.isArray(s.photos) ? s.photos.map(p => buildFileUrl(req, p)) : [],
    }));
    res.json({ success: true, sightings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
