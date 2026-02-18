const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

// GET /api/encyclopedia
router.get('/', async (req, res) => {
  try {
    const { category, conservation_status, search, limit = 20, offset = 0 } = req.query;
    let conditions = ['1=1'];
    let params = [];
    let idx = 1;
    if (category) { conditions.push(`category ILIKE $${idx++}`); params.push(category); }
    if (conservation_status) { conditions.push(`conservation_status = $${idx++}`); params.push(conservation_status); }
    if (search) {
      conditions.push(`to_tsvector('english', common_name || ' ' || COALESCE(scientific_name,'') || ' ' || COALESCE(description,'')) @@ plainto_tsquery('english', $${idx++})`);
      params.push(search);
    }
    params.push(parseInt(limit), parseInt(offset));
    const result = await db.query(
      `SELECT animal_id, common_name, scientific_name, category, conservation_status, diet,
              lifespan, photos, view_count
       FROM animal_encyclopedia
       WHERE ${conditions.join(' AND ')} AND is_verified = true
       ORDER BY view_count DESC, common_name ASC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );
    res.json({ success: true, animals: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/encyclopedia/:id
router.get('/:id', async (req, res) => {
  try {
    await db.query('UPDATE animal_encyclopedia SET view_count = view_count + 1 WHERE animal_id = $1', [req.params.id]);
    const result = await db.query('SELECT * FROM animal_encyclopedia WHERE animal_id = $1', [req.params.id]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Animal not found' });
    res.json({ success: true, animal: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/encyclopedia/favorites/:animalId
router.post('/favorites/:animalId', authenticate, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO user_favorites (user_id, animal_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.user_id, req.params.animalId]
    );
    res.json({ success: true, message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/encyclopedia/favorites/:animalId
router.delete('/favorites/:animalId', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM user_favorites WHERE user_id = $1 AND animal_id = $2',
      [req.user.user_id, req.params.animalId]);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
