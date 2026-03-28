const pool = require('../db/pool');
const { resolveStoredAssetUrl } = require('../middleware/upload');

const isRequestLike = (request) =>
  Boolean(request && typeof request === 'object' && typeof request.get === 'function');

const formatPet = (row, req = null) => ({
  id:                  row.id,
  name:                row.name,
  type:                row.type,
  breed:               row.breed,
  gender:              row.gender,
  age:                 row.age,
  weight:              row.weight,
  colorAppearance:     row.color_appearance,
  description:         row.description,
  distinctiveFeatures: row.distinctive_features,
  imageUrl:            resolveStoredAssetUrl(isRequestLike(req) ? req : null, row.image_url),
  status:              row.status,
  shelterName:         row.shelter_name,
  shelterEmail:        row.shelter_email,
  shelterPhone:        row.shelter_phone,
  location:            row.location,
  createdAt:           row.created_at,
});

// GET /api/pets
const getAllPets = async (req, res) => {
  try {
    const { type, status = 'Available', search } = req.query;

    let query  = 'SELECT * FROM pets WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (type && type !== 'All') {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR breed ILIKE $${params.length} OR type::text ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows.map((row) => formatPet(row, req)));
  } catch (err) {
    console.error('getAllPets error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/pets/:id
const getPetById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pets WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pet not found.' });
    res.json(formatPet(result.rows[0], req));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { getAllPets, getPetById, formatPet };
