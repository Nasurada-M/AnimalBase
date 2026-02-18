const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { profileUpload, handleUploadError, buildFileUrl } = require('../middleware/upload');
const { validate } = require('../middleware/validation');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT user_id, full_name, email, phone_number, alternate_phone, address,
              profile_photo, member_since, show_profile_publicly, share_location,
              push_notifications, email_notifications, created_at
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });
    const user = result.rows[0];
    if (user.profile_photo) user.profile_photo_url = buildFileUrl(req, user.profile_photo);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('full_name').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone_number').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  validate,
], async (req, res) => {
  try {
    const { full_name, phone_number, alternate_phone, address, email, show_profile_publicly, share_location, push_notifications, email_notifications } = req.body;
    if (email) {
      const exists = await db.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [email, req.user.user_id]);
      if (exists.rows.length > 0)
        return res.status(409).json({ success: false, message: 'Email already in use' });
    }
    const result = await db.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        alternate_phone = COALESCE($3, alternate_phone),
        address = COALESCE($4, address),
        email = COALESCE($5, email),
        show_profile_publicly = COALESCE($6, show_profile_publicly),
        share_location = COALESCE($7, share_location),
        push_notifications = COALESCE($8, push_notifications),
        email_notifications = COALESCE($9, email_notifications),
        updated_at = NOW()
       WHERE user_id = $10
       RETURNING user_id, full_name, email, phone_number, alternate_phone, address, profile_photo, show_profile_publicly, share_location, push_notifications, email_notifications`,
      [full_name, phone_number, alternate_phone, address, email,
       show_profile_publicly, share_location, push_notifications, email_notifications,
       req.user.user_id]
    );
    res.json({ success: true, message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/users/profile-photo
router.post('/profile-photo', authenticate, (req, res, next) => {
  profileUpload(req, res, (err) => {
    if (err) return handleUploadError(err, req, res, next);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    const filepath = `uploads/profiles/${req.file.filename}`;
    await db.query('UPDATE users SET profile_photo = $1, updated_at = NOW() WHERE user_id = $2',
      [filepath, req.user.user_id]);
    res.json({ success: true, message: 'Profile photo updated', photo_url: buildFileUrl(req, filepath) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// PUT /api/users/change-password
router.put('/change-password', authenticate, [
  body('current_password').notEmpty().withMessage('Current password required'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Must contain a special character'),
  validate,
], async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await db.query('SELECT password_hash FROM users WHERE user_id = $1', [req.user.user_id]);
    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match)
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [hash, req.user.user_id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// GET /api/users/my-reports
router.get('/my-reports', authenticate, async (req, res) => {
  try {
    const missing = await db.query(
      'SELECT * FROM missing_pets WHERE user_id = $1 ORDER BY created_at DESC', [req.user.user_id]);
    const applications = await db.query(
      `SELECT aa.*, ap.pet_name, ap.pet_type FROM adoption_applications aa
       JOIN available_pets ap ON aa.pet_id = ap.pet_id
       WHERE aa.user_id = $1 ORDER BY aa.created_at DESC`, [req.user.user_id]);
    res.json({ success: true, missing_pets: missing.rows, applications: applications.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
