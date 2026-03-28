const jwt  = require('jsonwebtoken');
const pool = require('../db/pool');

const getBearerTokenFromHeader = (header) => {
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim() || null;
};

const getAuthenticatedUserById = async (userId) => {
  const result = await pool.query(
    `SELECT id, full_name, email, phone, address, avatar_url, role,
            new_pet_email_notifications_enabled,
            pet_finder_email_notifications_enabled
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

const getUserFromToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return getAuthenticatedUserById(decoded.id);
};

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const token = getBearerTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
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

module.exports = {
  authenticate,
  requireAdmin,
  getBearerTokenFromHeader,
  getAuthenticatedUserById,
  getUserFromToken,
};
