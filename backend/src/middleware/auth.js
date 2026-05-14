const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

/**
 * Resolve the JWT secret from env. Throws in production so we never sign with
 * the previously-hardcoded "forensic-accounting-secret-key-2024" fallback.
 * In dev we fall back to a long random-but-known dev-only secret.
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length > 0) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'dev-only-insecure-secret-do-not-use-in-prod';
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const userRole = req.user.role || 'analyst';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: `Insufficient permissions. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole, getJwtSecret };
