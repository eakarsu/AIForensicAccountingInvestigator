const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

/**
 * Resolve the JWT secret from env. Throws in production so we never sign with
 * the previously-hardcoded "forensic-accounting-secret-key-2024" fallback.
 * Every environment must supply an application-specific secret.
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    return process.env.JWT_SECRET;
  }
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
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
