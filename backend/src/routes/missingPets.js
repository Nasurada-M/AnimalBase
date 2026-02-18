const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { missingPhotosUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { validate } = require('../middleware/validation');

const buildPhotoUrls = (req, photos) =>
  Array.isArray(photos) ? photos.map(p => buildFileUrl(req, p)) : [];

// GET /api/missing-pets
router.get('/', async (req, res) => {
  try {
    const { status, pet_type, search, limit = 20, offset = 0 } = req.query;
    let conditions = ['1=1'];
    let params = [];
    let idx = 1;
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (pet_type) { conditions.push(`pet_type ILIKE $${idx++}`); params.push(pet_type); }
    if (search) {
      conditions.push(`(pet_name ILIKE $${idx} OR breed ILIKE $${idx} OR location_last_seen ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT mp.*, u.full_name AS owner_name FROM missing_pets mp
       LEFT JOIN users u ON mp.user_id = u.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY mp.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    const pets = result.rows.map(p => ({ ...p, photo_urls: buildPhotoUrls(req, p.photos) }));
    res.json({ success: true, missing_pets: pets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/missing-pets/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT mp.*, u.full_name AS owner_name FROM missing_pets mp
       LEFT JOIN users u ON mp.user_id = u.user_id
       WHERE mp.missing_pet_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Missing pet not found' });
    const pet = { ...result.rows[0], photo_urls: buildPhotoUrls(req, result.rows[0].photos) };
    const sightings = await db.query(
      'SELECT * FROM sighting_reports WHERE missing_pet_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, missing_pet: pet, sightings: sightings.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/missing-pets
router.post('/', authenticate, (req, res, next) => {
  missingPhotosUpload(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, [
  body('pet_name').trim().notEmpty().withMessage('Pet name required'),
  body('pet_type').notEmpty().withMessage('Pet type required'),
  body('date_last_seen').isDate().withMessage('Valid date required (YYYY-MM-DD)'),
  body('location_last_seen').trim().notEmpty().withMessage('Last seen location required'),
  body('contact_number').isMobilePhone().withMessage('Valid contact number required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  validate,
], async (req, res) => {
  try {
    const { pet_name, pet_type, breed, gender, age_category, age_months, weight,
            color_appearance, description, distinctive_features, date_last_seen,
            location_last_seen, latitude, longitude, contact_number, alternate_contact,
            email, reward_offered } = req.body;
    const photos = req.files ? req.files.map(f => `uploads/missing/${f.filename}`) : [];
    const result = await db.query(
      `INSERT INTO missing_pets (user_id, pet_name, pet_type, breed, gender, age_category,
        age_months, weight, color_appearance, description, distinctive_features, date_last_seen,
        location_last_seen, latitude, longitude, contact_number, alternate_contact, email,
        reward_offered, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [req.user.user_id, pet_name, pet_type, breed, gender, age_category, age_months, weight,
       color_appearance, description, distinctive_features, date_last_seen, location_last_seen,
       latitude || null, longitude || null, contact_number, alternate_contact || null, email,
       reward_offered || null, photos]
    );
    res.status(201).json({ success: true, message: 'Missing pet report created', missing_pet: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/missing-pets/:id/status
router.put('/:id/status', authenticate, [
  body('status').isIn(['Missing', 'Found', 'Closed']).withMessage('Invalid status'),
  validate,
], async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE missing_pets SET status = $1, updated_at = NOW()
       WHERE missing_pet_id = $2 AND user_id = $3 RETURNING *`,
      [req.body.status, req.params.id, req.user.user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized' });
    res.json({ success: true, message: 'Status updated', missing_pet: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
