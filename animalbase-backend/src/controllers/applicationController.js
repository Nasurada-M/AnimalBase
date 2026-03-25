const pool = require('../db/pool');

const formatApp = (row) => ({
  id:                     row.id,
  petId:                  row.pet_id,
  petName:                row.pet_name,
  petImageUrl:            row.pet_image_url || row.image_url,
  petType:                row.pet_type || row.type,
  userId:                 row.user_id == null ? undefined : Number(row.user_id),
  fullName:               row.full_name,
  email:                  row.email,
  phone:                  row.phone,
  homeAddress:            row.home_address,
  previousPetExperience:  row.previous_pet_experience,
  whyAdopt:               row.why_adopt,
  whyChooseYou:           row.why_choose_you,
  status:                 row.status,
  adminRemark:            row.admin_remark,
  submittedAt:            row.submitted_at,
  updatedAt:              row.updated_at,
});

// POST /api/applications
const submitApplication = async (req, res) => {
  try {
    const {
      petId, fullName, email, phone, homeAddress,
      previousPetExperience, whyAdopt, whyChooseYou,
    } = req.body;

    if (!petId || !fullName || !email || !phone || !homeAddress || !previousPetExperience || !whyAdopt || !whyChooseYou) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check pet exists and is available
    const petResult = await pool.query('SELECT id, status FROM pets WHERE id = $1', [petId]);
    if (petResult.rows.length === 0) return res.status(404).json({ error: 'Pet not found.' });
    if (petResult.rows[0].status !== 'Available') return res.status(400).json({ error: 'Pet is not available for adoption.' });

    // Only block duplicate pending applications for the same pet.
    const existing = await pool.query(
      "SELECT id FROM adoption_applications WHERE pet_id=$1 AND user_id=$2 AND status = 'Pending'",
      [petId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending application for this pet.' });
    }

    const result = await pool.query(
      `INSERT INTO adoption_applications
         (pet_id, user_id, full_name, email, phone, home_address,
          previous_pet_experience, why_adopt, why_choose_you)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [petId, req.user.id, fullName, email, phone, homeAddress,
       previousPetExperience, whyAdopt, whyChooseYou]
    );

    // Get pet details to return with app
    const pet = await pool.query('SELECT name, image_url, type FROM pets WHERE id=$1', [petId]);
    const app = { ...result.rows[0], pet_name: pet.rows[0]?.name, pet_image_url: pet.rows[0]?.image_url, pet_type: pet.rows[0]?.type };

    res.status(201).json(formatApp(app));
  } catch (err) {
    console.error('submitApplication error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// GET /api/applications/my
const getMyApplications = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT aa.*, p.name as pet_name, p.image_url as pet_image_url, p.type::text as pet_type
       FROM adoption_applications aa
       JOIN pets p ON aa.pet_id = p.id
       WHERE aa.user_id = $1
       ORDER BY aa.submitted_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map(formatApp));
  } catch (err) {
    console.error('getMyApplications error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { submitApplication, getMyApplications, formatApp };
