const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../config/database');
const { validate } = require('../middleware/validation');

// POST /api/auth/register
router.post('/register', [
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('phone_number').optional().isMobilePhone().withMessage('Valid phone number required'),
  validate,
], async (req, res) => {
  try {
    const { full_name, email, password, phone_number, address } = req.body;
    const exists = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0)
      return res.status(409).json({ success: false, message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, address)
       VALUES ($1,$2,$3,$4,$5) RETURNING user_id, full_name, email, member_since`,
      [full_name, email, password_hash, phone_number || null, address || null]
    );
    const user = result.rows[0];
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    res.status(201).json({ success: true, message: 'Account created successfully', token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  validate,
], async (req, res) => {
  try {
    const { email, password, fcm_token } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (fcm_token) {
      await db.query('UPDATE users SET updated_at = NOW() WHERE user_id = $1', [user.user_id]);
    }
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const { password_hash, reset_token, reset_token_expiry, ...safeUser } = user;
    res.json({ success: true, message: 'Login successful', token, user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  validate,
], async (req, res) => {
  try {
    const { email } = req.body;
    const result = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    // Always return success to prevent email enumeration
    if (result.rows.length > 0) {
      const token = require('crypto').randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 3600000); // 1 hour
      await db.query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
        [token, expiry, email]
      );
      // In production, send email here
      console.log(`Password reset token for ${email}: ${token}`);
    }
    res.json({ success: true, message: 'If email exists, reset instructions sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
