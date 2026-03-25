const pool = require('../db/pool');
const { buildUploadedFileUrl } = require('../middleware/upload');
const {
  normalizeText,
  parseCoordinatePair,
  reverseGeocodeCoordinates,
} = require('../utils/location');

let sightingGeoPointColumnPromise = null;

function hasSightingGeoPointColumn() {
  if (!sightingGeoPointColumnPromise) {
    sightingGeoPointColumnPromise = pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'sightings'
           AND column_name = 'geo_point'
       ) AS has_geo_point`
    ).then((result) => Boolean(result.rows[0]?.has_geo_point))
      .catch((err) => {
        sightingGeoPointColumnPromise = null;
        throw err;
      });
  }

  return sightingGeoPointColumnPromise;
}

const formatLostPet = (row) => ({
  id:                  row.id,
  petName:             row.pet_name,
  type:                row.type,
  breed:               row.breed,
  gender:              row.gender,
  age:                 row.age,
  weight:              row.weight,
  colorAppearance:     row.color_appearance,
  description:         row.description,
  distinctiveFeatures: row.distinctive_features,
  imageUrl:            row.image_url,
  lastSeenLocation:    row.last_seen_location,
  lastSeenDate:        row.last_seen_date,
  rewardOffered:       row.reward_offered,
  ownerName:           row.owner_name,
  ownerEmail:          row.owner_email,
  ownerPhone:          row.owner_phone,
  ownerPhone2:         row.owner_phone2,
  reportedById:        row.reported_by == null ? undefined : Number(row.reported_by),
  status:              row.status,
  reportedAt:          row.reported_at,
});

const formatSighting = (row) => ({
  id:            row.id,
  lostPetId:     row.lost_pet_id,
  reporterName:  row.reporter_name,
  reporterEmail: row.reporter_email,
  reporterPhone: row.reporter_phone,
  locationSeen:  row.location_seen,
  address:       row.address,
  latitude:      row.latitude == null ? undefined : Number(row.latitude),
  longitude:     row.longitude == null ? undefined : Number(row.longitude),
  dateSeen:      row.date_seen,
  description:   row.description,
  imageUrl:      row.image_url,
  reportedAt:    row.reported_at,
});

// GET /api/lost-pets
const getAllLostPets = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query  = "SELECT * FROM lost_pets WHERE 1=1";
    const params = [];

    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (pet_name ILIKE $${params.length} OR breed ILIKE $${params.length} OR type ILIKE $${params.length})`; }

    query += ' ORDER BY reported_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(formatLostPet));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/lost-pets/:id
const getLostPetById = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lost_pets WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(formatLostPet(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/lost-pets/:id/sightings
const getSightings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sightings WHERE lost_pet_id=$1 ORDER BY reported_at DESC',
      [req.params.id]
    );
    res.json(result.rows.map(formatSighting));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// POST /api/lost-pets
const reportMissingPet = async (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.status(400).json({ error: req.fileValidationError });
    }

    const petName = normalizeText(req.body.petName);
    const type = normalizeText(req.body.type || req.body.petType);
    const breed = normalizeText(req.body.breed);
    const gender = normalizeText(req.body.gender);
    const age = normalizeText(req.body.age || req.body.ageRange);
    const weight = normalizeText(req.body.weight);
    const colorAppearance = normalizeText(req.body.colorAppearance);
    const description = normalizeText(req.body.description);
    const distinctiveFeatures = normalizeText(req.body.distinctiveFeatures);
    const imageUrl = buildUploadedFileUrl(req, req.file) || normalizeText(req.body.imageUrl);
    const lastSeenLocation = normalizeText(req.body.lastSeenLocation);
    const lastSeenDate = normalizeText(req.body.lastSeenDate);
    const rewardOffered = normalizeText(req.body.rewardOffered);
    const ownerName = normalizeText(req.body.ownerName) || normalizeText(req.user?.full_name);
    const ownerEmail = normalizeText(req.user?.email) || normalizeText(req.body.ownerEmail || req.body.email);
    const ownerPhone = normalizeText(req.body.ownerPhone || req.body.phoneNumber) || normalizeText(req.user?.phone);
    const ownerPhone2 = normalizeText(req.body.ownerPhone2);

    if (!petName || !type || !breed || !gender || !age || !colorAppearance || !description || !lastSeenLocation || !lastSeenDate || !ownerName || !ownerEmail || !ownerPhone) {
      return res.status(400).json({ error: 'Required fields are missing.' });
    }

    const result = await pool.query(
      `INSERT INTO lost_pets
         (pet_name, type, breed, gender, age, weight, color_appearance, description,
          distinctive_features, image_url, last_seen_location, last_seen_date,
          reward_offered, owner_name, owner_email, owner_phone, owner_phone2, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [petName, type, breed, gender, age, weight, colorAppearance, description,
       distinctiveFeatures, imageUrl, lastSeenLocation, lastSeenDate,
       rewardOffered, ownerName, ownerEmail, ownerPhone, ownerPhone2,
       req.user?.id || null]
    );

    res.status(201).json(formatLostPet(result.rows[0]));
  } catch (err) {
    console.error('reportMissingPet error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// POST /api/lost-pets/:id/sightings
const reportSighting = async (req, res) => {
  try {
    const {
      reporterName,
      reporterEmail,
      reporterPhone,
      locationSeen,
      dateSeen,
      description,
      imageUrl,
      latitude: latitudeRaw,
      longitude: longitudeRaw,
    } = req.body;

    if (!reporterName || !reporterEmail || !reporterPhone || !locationSeen || !dateSeen || !description) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    let latitude;
    let longitude;

    try {
      ({ latitude, longitude } = parseCoordinatePair(latitudeRaw, longitudeRaw));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const resolvedAddress = await reverseGeocodeCoordinates(latitude, longitude);
    const normalizedLocationSeen = normalizeText(locationSeen);
    const finalLocationSeen = resolvedAddress || normalizedLocationSeen;

    if (!finalLocationSeen) {
      return res.status(400).json({ error: 'A readable location is required.' });
    }

    const params = [
      req.params.id,
      reporterName,
      reporterEmail,
      reporterPhone,
      finalLocationSeen,
      resolvedAddress,
      latitude,
      longitude,
      dateSeen,
      description,
      imageUrl || null,
      req.user?.id || null,
    ];

    const columns = [
      'lost_pet_id',
      'reporter_name',
      'reporter_email',
      'reporter_phone',
      'location_seen',
      'address',
      'latitude',
      'longitude',
      'date_seen',
      'description',
      'image_url',
      'reported_by',
    ];

    const values = params.map((_, index) => `$${index + 1}`);

    if (latitude !== null && longitude !== null && await hasSightingGeoPointColumn()) {
      columns.push('geo_point');
      values.push('ST_SetSRID(ST_MakePoint($8, $7), 4326)');
    }

    const result = await pool.query(
      `INSERT INTO sightings (${columns.join(', ')})
       VALUES (${values.join(', ')})
       RETURNING *`,
      params
    );

    res.status(201).json(formatSighting(result.rows[0]));
  } catch (err) {
    console.error('reportSighting error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

const markLostPetAsFound = async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM lost_pets WHERE id=$1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Not found.' });
    }

    const lostPet = existing.rows[0];
    const normalizedOwnerEmail = typeof lostPet.owner_email === 'string'
      ? lostPet.owner_email.trim().toLowerCase()
      : '';
    const normalizedUserEmail = typeof req.user?.email === 'string'
      ? req.user.email.trim().toLowerCase()
      : '';
    const isOwner =
      (lostPet.reported_by != null && Number(lostPet.reported_by) === Number(req.user?.id))
      || (normalizedOwnerEmail && normalizedOwnerEmail === normalizedUserEmail);

    if (!isOwner) {
      return res.status(403).json({ error: 'You can only update reports you submitted.' });
    }

    if (lostPet.status === 'Found') {
      return res.json(formatLostPet(lostPet));
    }

    const result = await pool.query(
      'UPDATE lost_pets SET status=$1 WHERE id=$2 RETURNING *',
      ['Found', req.params.id]
    );

    res.json(formatLostPet(result.rows[0]));
  } catch (err) {
    console.error('markLostPetAsFound error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  formatLostPet,
  getAllLostPets,
  getLostPetById,
  getSightings,
  reportMissingPet,
  reportSighting,
  markLostPetAsFound,
};
