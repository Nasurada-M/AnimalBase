const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT id, full_name, email, phone, address, avatar_url, role,
              new_pet_email_notifications_enabled
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// Must be admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
