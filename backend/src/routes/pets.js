const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { petPhotosUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { validate } = require('../middleware/validation');

const buildPhotoUrls = (req, photos) =>
  Array.isArray(photos) ? photos.map(p => buildFileUrl(req, p)) : [];

// GET /api/pets - list available pets with filters
router.get('/', async (req, res) => {
  try {
    const { type, status = 'Available', search, limit = 20, offset = 0 } = req.query;
    let conditions = ['1=1'];
    let params = [];
    let idx = 1;
    if (type) { conditions.push(`pet_type ILIKE $${idx++}`); params.push(type); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (search) {
      conditions.push(`to_tsvector('english', pet_name || ' ' || COALESCE(breed,'') || ' ' || COALESCE(description,'')) @@ plainto_tsquery('english', $${idx++})`);
      params.push(search);
    }
    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT ap.*, s.shelter_name, s.address AS shelter_address, s.phone AS shelter_phone
       FROM available_pets ap
       LEFT JOIN shelters s ON ap.shelter_id = s.shelter_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ap.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    const pets = result.rows.map(p => ({ ...p, photo_urls: buildPhotoUrls(req, p.photos) }));
    const countResult = await db.query(
      `SELECT COUNT(*) FROM available_pets WHERE ${conditions.slice(0, conditions.length).join(' AND ')}`,
      params.slice(0, params.length - 2)
    );
    res.json({ success: true, pets, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/pets/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ap.*, s.shelter_name, s.address AS shelter_address, s.phone AS shelter_phone,
              s.email AS shelter_email, s.facebook, s.instagram
       FROM available_pets ap
       LEFT JOIN shelters s ON ap.shelter_id = s.shelter_id
       WHERE ap.pet_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Pet not found' });
    const pet = { ...result.rows[0], photo_urls: buildPhotoUrls(req, result.rows[0].photos) };
    res.json({ success: true, pet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/pets - add pet (shelter admin)
router.post('/', authenticate, (req, res, next) => {
  petPhotosUpload(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, [
  body('pet_name').trim().notEmpty().withMessage('Pet name required'),
  body('pet_type').notEmpty().withMessage('Pet type required'),
  validate,
], async (req, res) => {
  try {
    const { pet_name, pet_type, breed, gender, age_category, age_months, weight,
            color_appearance, description, distinctive_features, shelter_id, current_location } = req.body;
    const photos = req.files ? req.files.map(f => `uploads/pets/${f.filename}`) : [];
    const result = await db.query(
      `INSERT INTO available_pets (shelter_id, pet_name, pet_type, breed, gender, age_category,
        age_months, weight, color_appearance, description, distinctive_features, photos, current_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [shelter_id, pet_name, pet_type, breed, gender, age_category,
       age_months, weight, color_appearance, description, distinctive_features, photos, current_location]
    );
    res.status(201).json({ success: true, pet: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/pets/:id/status - update pet status
router.put('/:id/status', authenticate, [
  body('status').isIn(['Available', 'Pending', 'Adopted']).withMessage('Invalid status'),
  validate,
], async (req, res) => {
  try {
    const { status } = req.body;
    const adopted_date = status === 'Adopted' ? new Date() : null;
    const result = await db.query(
      `UPDATE available_pets SET status = $1, adopted_date = $2, updated_at = NOW()
       WHERE pet_id = $3 RETURNING *`,
      [status, adopted_date, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Pet not found' });
    res.json({ success: true, message: `Pet status updated to ${status}`, pet: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
