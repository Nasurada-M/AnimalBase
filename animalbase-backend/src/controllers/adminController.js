const pool   = require('../db/pool');
const bcrypt = require('bcryptjs');
const { formatPet }  = require('./petController');
const { formatApp }  = require('./applicationController');
const { sendNewPetAvailabilityEmails } = require('./authController');
const { deleteUserAccountById } = require('../utils/accountDeletion');

const ADOPTED_PET_LOCK_MESSAGE = 'This pet has already been adopted by its new owners.';

const queueNewPetAvailabilityEmails = (pet) => {
  sendNewPetAvailabilityEmails(pet).catch((err) => {
    console.error(
      '[notifications] Failed to queue new-pet email notifications:',
      err instanceof Error ? err.message : err
    );
  });
};

// ── DASHBOARD STATS ──────────────────────────────────────────────────────────

const getDashboardStats = async (req, res) => {
  try {
    const [users, pets, apps, lost, sightings] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'user'"),
      pool.query("SELECT COUNT(*) FROM pets WHERE status = 'Available'"),
      pool.query("SELECT COUNT(*) FROM adoption_applications WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) FROM lost_pets WHERE status = 'Missing'"),
      pool.query("SELECT COUNT(*) FROM sightings"),
    ]);

    const recentApps = await pool.query(
      `SELECT aa.id, aa.status, aa.submitted_at, aa.full_name,
              p.name as pet_name, p.type::text as pet_type
       FROM adoption_applications aa
       JOIN pets p ON aa.pet_id = p.id
       ORDER BY aa.submitted_at DESC LIMIT 5`
    );

    // Recent sightings for activity feed
    const recentSightings = await pool.query(
      `SELECT s.id, s.reporter_name, s.location_seen, s.date_seen, s.reported_at,
              lp.pet_name, lp.type as pet_type
       FROM sightings s
       JOIN lost_pets lp ON s.lost_pet_id = lp.id
       ORDER BY s.reported_at DESC LIMIT 5`
    );

    res.json({
      totalUsers:         parseInt(users.rows[0].count),
      availablePets:      parseInt(pets.rows[0].count),
      pendingApps:        parseInt(apps.rows[0].count),
      missingPets:        parseInt(lost.rows[0].count),
      totalSightings:     parseInt(sightings.rows[0].count),
      recentApplications: recentApps.rows,
      recentSightings:    recentSightings.rows,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── USERS ────────────────────────────────────────────────────────────────────

const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = "SELECT id, full_name, email, phone, address, avatar_url, role, joined_at FROM users WHERE 1=1";
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    query += ' ORDER BY joined_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(u => ({
      id: u.id, fullName: u.full_name, email: u.email,
      phone: u.phone, address: u.address, avatarUrl: u.avatar_url,
      role: u.role, joinedAt: u.joined_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const getUserById = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, full_name, email, phone, address, avatar_url, role, joined_at FROM users WHERE id=$1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const u = result.rows[0];
    res.json({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      avatarUrl: u.avatar_url,
      role: u.role,
      joinedAt: u.joined_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, address, role, avatarUrl } = req.body;
    const result = await pool.query(
      `UPDATE users SET full_name=$1, email=$2, phone=$3, address=$4, role=$5, avatar_url=$6
       WHERE id=$7
       RETURNING id, full_name, email, phone, address, avatar_url, role, joined_at`,
      [fullName, email, phone, address, role, avatarUrl ?? null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const u = result.rows[0];
    res.json({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      address: u.address,
      avatarUrl: u.avatar_url,
      role: u.role,
      joinedAt: u.joined_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    const result = await deleteUserAccountById(Number(req.params.id));
    if (!result.deleted) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.params.id]);
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── PETS ─────────────────────────────────────────────────────────────────────

const adminGetAllPets = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = 'SELECT * FROM pets WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND status=$${params.length}`; }
    if (type && type !== 'All') { params.push(type); query += ` AND type=$${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $${params.length} OR breed ILIKE $${params.length})`; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(formatPet));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const createPet = async (req, res) => {
  try {
    const { name, type, breed, gender, age, weight, colorAppearance, description,
            distinctiveFeatures, imageUrl, status, shelterName, shelterEmail,
            shelterPhone, location } = req.body;
    if (!name || !type || !breed || !gender || !age || !weight || !colorAppearance || !description) {
      return res.status(400).json({ error: 'Required fields are missing.' });
    }
    const result = await pool.query(
      `INSERT INTO pets (name, type, breed, gender, age, weight, color_appearance, description,
         distinctive_features, image_url, status, shelter_name, shelter_email, shelter_phone, location, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [name, type, breed, gender, age, weight, colorAppearance, description,
       distinctiveFeatures, imageUrl, status || 'Available',
       shelterName, shelterEmail, shelterPhone, location, req.user.id]
    );
    const createdPet = formatPet(result.rows[0]);

    if (createdPet.status === 'Available') {
      queueNewPetAvailabilityEmails(createdPet);
    }

    res.status(201).json(createdPet);
  } catch (err) {
    console.error('createPet error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

const updatePet = async (req, res) => {
  try {
    const { name, type, breed, gender, age, weight, colorAppearance, description,
            distinctiveFeatures, imageUrl, status, shelterName, shelterEmail,
            shelterPhone, location } = req.body;
    const existingPet = await pool.query(
      'SELECT id, status FROM pets WHERE id=$1',
      [req.params.id]
    );
    if (existingPet.rows.length === 0) return res.status(404).json({ error: 'Pet not found.' });
    if (existingPet.rows[0].status === 'Adopted') {
      return res.status(409).json({ error: ADOPTED_PET_LOCK_MESSAGE });
    }

    const result = await pool.query(
      `UPDATE pets SET name=$1, type=$2, breed=$3, gender=$4, age=$5, weight=$6,
         color_appearance=$7, description=$8, distinctive_features=$9, image_url=$10,
         status=$11, shelter_name=$12, shelter_email=$13, shelter_phone=$14, location=$15
       WHERE id=$16 RETURNING *`,
      [name, type, breed, gender, age, weight, colorAppearance, description,
       distinctiveFeatures, imageUrl, status, shelterName, shelterEmail, shelterPhone, location,
       req.params.id]
    );
    const updatedPet = formatPet(result.rows[0]);

    if (existingPet.rows[0].status !== 'Available' && updatedPet.status === 'Available') {
      queueNewPetAvailabilityEmails(updatedPet);
    }

    res.json(updatedPet);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const deletePet = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pets WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pet not found.' });
    res.json({ message: 'Pet deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── APPLICATIONS ─────────────────────────────────────────────────────────────

const adminGetAllApplications = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `SELECT aa.*, p.name as pet_name, p.image_url as pet_image_url, p.type::text as pet_type
                 FROM adoption_applications aa JOIN pets p ON aa.pet_id = p.id WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND aa.status=$${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (aa.full_name ILIKE $${params.length} OR p.name ILIKE $${params.length})`; }
    query += ' ORDER BY aa.submitted_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(formatApp));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const updateApplicationStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const normalizedRemark =
      typeof remark === 'string' && remark.trim().length > 0 ? remark.trim() : null;
    if (status !== 'Pending' && !normalizedRemark) {
      return res.status(400).json({ error: 'Remark is required when approving or rejecting an application.' });
    }
    const result = await pool.query(
      `UPDATE adoption_applications SET status=$1, admin_remark=$2 WHERE id=$3
       RETURNING *, (SELECT name FROM pets WHERE id=pet_id) as pet_name,
                    (SELECT image_url FROM pets WHERE id=pet_id) as pet_image_url,
                    (SELECT type::text FROM pets WHERE id=pet_id) as pet_type`,
      [status, status === 'Pending' ? null : normalizedRemark, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });

    if (status === 'Approved') {
      const petId = result.rows[0].pet_id;

      // Mark pet as adopted
      await pool.query("UPDATE pets SET status='Adopted' WHERE id=$1", [petId]);

      // Auto-reject all other pending applications for the same pet
      await pool.query(
        `UPDATE adoption_applications
         SET status='Rejected',
             admin_remark='Another applicant was selected for this pet.'
         WHERE pet_id=$1 AND id!=$2 AND status='Pending'`,
        [petId, req.params.id]
      );
    }

    res.json(formatApp(result.rows[0]));
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

const resetPetAdoption = async (req, res) => {
  try {
    const petId = req.params.id;

    const petResult = await pool.query('SELECT id, status FROM pets WHERE id=$1', [petId]);
    if (petResult.rows.length === 0) return res.status(404).json({ error: 'Pet not found.' });
    if (petResult.rows[0].status === 'Adopted') {
      return res.status(409).json({ error: ADOPTED_PET_LOCK_MESSAGE });
    }
    if (petResult.rows[0].status !== 'Adopted') {
      return res.status(400).json({ error: 'Pet is not currently adopted.' });
    }
  } catch (err) {
    console.error('resetPetAdoption error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── LOST PETS (Admin) ─────────────────────────────────────────────────────────

const adminGetAllLostPets = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT lp.*,
                   COUNT(s.id)::int AS sighting_count
                 FROM lost_pets lp
                 LEFT JOIN sightings s ON s.lost_pet_id = lp.id
                 WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); query += ` AND lp.status = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (lp.pet_name ILIKE $${params.length} OR lp.breed ILIKE $${params.length} OR lp.type ILIKE $${params.length})`;
    }
    query += ' GROUP BY lp.id ORDER BY lp.reported_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      id:               row.id,
      petName:          row.pet_name,
      type:             row.type,
      breed:            row.breed,
      gender:           row.gender,
      colorAppearance:  row.color_appearance,
      description:      row.description,
      imageUrl:         row.image_url,
      lastSeenLocation: row.last_seen_location,
      lastSeenDate:     row.last_seen_date,
      rewardOffered:    row.reward_offered,
      ownerName:        row.owner_name,
      ownerEmail:       row.owner_email,
      ownerPhone:       row.owner_phone,
      status:           row.status,
      reportedAt:       row.reported_at,
      sightingCount:    row.sighting_count,
    })));
  } catch (err) {
    console.error('adminGetAllLostPets error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

const updateLostPetStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Missing', 'Found'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    const result = await pool.query(
      'UPDATE lost_pets SET status=$1 WHERE id=$2 RETURNING id, pet_name, status',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

const deleteLostPet = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lost_pets WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Report deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

// ── SIGHTINGS (Admin) ─────────────────────────────────────────────────────────

const adminGetAllSightings = async (req, res) => {
  try {
    const { lostPetId } = req.query;
    let query = `SELECT s.*,
                   lp.pet_name, lp.type as pet_type, lp.breed as pet_breed,
                   lp.image_url as pet_image_url, lp.status as pet_status
                 FROM sightings s
                 JOIN lost_pets lp ON s.lost_pet_id = lp.id
                 WHERE 1=1`;
    const params = [];
    if (lostPetId) { params.push(lostPetId); query += ` AND s.lost_pet_id = $${params.length}`; }
    query += ' ORDER BY s.reported_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(row => ({
      id:            row.id,
      lostPetId:     row.lost_pet_id,
      petName:       row.pet_name,
      petType:       row.pet_type,
      petBreed:      row.pet_breed,
      petImageUrl:   row.pet_image_url,
      petStatus:     row.pet_status,
      reporterName:  row.reporter_name,
      reporterEmail: row.reporter_email,
      reporterPhone: row.reporter_phone,
      locationSeen:  row.location_seen,
      address:       row.address,
      latitude:      row.latitude == null ? undefined : Number(row.latitude),
      longitude:     row.longitude == null ? undefined : Number(row.longitude),
      dateSeen:      row.date_seen,
      description:   row.description,
      reportedAt:    row.reported_at,
    })));
  } catch (err) {
    console.error('adminGetAllSightings error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

const deleteSighting = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sightings WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sighting not found.' });
    res.json({ message: 'Sighting deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers, getUserById, updateUser, deleteUser, resetUserPassword,
  adminGetAllPets, createPet, updatePet, deletePet,
  adminGetAllApplications, updateApplicationStatus, resetPetAdoption,
  adminGetAllLostPets, updateLostPetStatus, deleteLostPet,
  adminGetAllSightings, deleteSighting,
};
