const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const db      = require('../config/database');
const { authenticate }  = require('../middleware/auth');
const { validate }      = require('../middleware/validation');
const { pushToUser }    = require('../config/websocket');   // ← no Firebase

// Helper: insert notification row + push via WebSocket
async function notify(userId, type, title, message, relatedId) {
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, related_id)
     VALUES ($1,$2,$3,$4,$5)`,
    [userId, type, title, message, relatedId]
  );
  pushToUser(userId, { type, title, message, related_id: relatedId });
}

// POST /api/adoptions — submit adoption application
router.post('/', authenticate, [
  body('pet_id').isInt().withMessage('Valid pet ID required'),
  body('full_name').trim().notEmpty().withMessage('Full name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone_number').isMobilePhone().withMessage('Valid phone number required'),
  body('home_address').trim().notEmpty().withMessage('Home address required'),
  body('why_adopt').trim().notEmpty().withMessage('Reason for adoption required'),
  validate,
], async (req, res) => {
  try {
    const { pet_id, full_name, email, phone_number, home_address,
            previous_pet_experience, why_adopt, why_chosen } = req.body;

    // Check pet exists and is Available
    const petCheck = await db.query(
      'SELECT pet_id, pet_name, status FROM available_pets WHERE pet_id = $1', [pet_id]);
    if (petCheck.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Pet not found' });
    if (petCheck.rows[0].status !== 'Available')
      return res.status(400).json({ success: false, message: `Pet is currently ${petCheck.rows[0].status}` });

    // No duplicate pending application
    const existing = await db.query(
      `SELECT application_id FROM adoption_applications
       WHERE user_id=$1 AND pet_id=$2 AND status='Under Review'`,
      [req.user.user_id, pet_id]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ success: false, message: 'You already have a pending application for this pet' });

    const result = await db.query(
      `INSERT INTO adoption_applications
         (user_id, pet_id, full_name, email, phone_number, home_address,
          previous_pet_experience, why_adopt, why_chosen)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.user_id, pet_id, full_name, email, phone_number, home_address,
       previous_pet_experience, why_adopt, why_chosen]
    );

    // Move pet to Pending
    await db.query(
      "UPDATE available_pets SET status='Pending', updated_at=NOW() WHERE pet_id=$1", [pet_id]);

    // Notify applicant
    await notify(
      req.user.user_id,
      'application_received',
      'Application Received',
      `Your adoption application for ${petCheck.rows[0].pet_name} is under review.`,
      result.rows[0].application_id
    );

    res.status(201).json({ success: true, message: 'Adoption application submitted', application: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/adoptions/my-applications
router.get('/my-applications', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT aa.*, ap.pet_name, ap.pet_type, ap.breed, ap.photos, s.shelter_name
       FROM adoption_applications aa
       JOIN available_pets ap ON aa.pet_id = ap.pet_id
       LEFT JOIN shelters s ON ap.shelter_id = s.shelter_id
       WHERE aa.user_id=$1 ORDER BY aa.created_at DESC`,
      [req.user.user_id]
    );
    res.json({ success: true, applications: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/adoptions/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT aa.*, ap.pet_name, ap.pet_type, ap.photos AS pet_photos
       FROM adoption_applications aa
       JOIN available_pets ap ON aa.pet_id = ap.pet_id
       WHERE aa.application_id=$1 AND aa.user_id=$2`,
      [req.params.id, req.user.user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Application not found' });
    res.json({ success: true, application: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/adoptions/:id/review — shelter admin reviews application
router.put('/:id/review', authenticate, [
  body('status').isIn(['Under Review', 'Approved', 'Rejected']).withMessage('Invalid status'),
  validate,
], async (req, res) => {
  try {
    const { status, notes } = req.body;

    const result = await db.query(
      `UPDATE adoption_applications
       SET status=$1, notes=$2, reviewed_at=NOW(), reviewed_by=$3, updated_at=NOW()
       WHERE application_id=$4
       RETURNING *`,
      [status, notes, req.user.user_id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Application not found' });

    const app = result.rows[0];

    // Update pet status accordingly
    if (status === 'Approved') {
      await db.query(
        "UPDATE available_pets SET status='Adopted', adopted_date=NOW() WHERE pet_id=$1", [app.pet_id]);
    } else if (status === 'Rejected') {
      await db.query(
        "UPDATE available_pets SET status='Available', updated_at=NOW() WHERE pet_id=$1", [app.pet_id]);
    }

    // Notify applicant (WebSocket + DB)
    const msgMap = {
      Approved: 'Congratulations! Your adoption application has been APPROVED!',
      Rejected:  `Your adoption application was rejected. ${notes || ''}`.trim(),
      'Under Review': 'Your application status has been updated.',
    };
    await notify(app.user_id, 'application_status', `Application ${status}`, msgMap[status], app.application_id);

    res.json({ success: true, message: `Application ${status}`, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
