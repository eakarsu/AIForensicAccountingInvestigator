const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./auth');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' }
});

/**
 * AI rate limiter: 20 requests/hour per authenticated user.
 *
 * Mounted on /api/*\/analyze (etc.) before authenticateToken in some setups,
 * so we decode the JWT directly here (without throwing) to recover the user
 * id. If decoding fails we fall back to client IP so unauthenticated abuse is
 * still throttled.
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait before retrying.' },
  keyGenerator: (req) => {
    if (req.user && req.user.id) return `user:${req.user.id}`;
    const auth = req.headers && req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const decoded = jwt.verify(token, getJwtSecret());
        if (decoded && decoded.id) return `user:${decoded.id}`;
      } catch (_) { /* fall through */ }
    }
    return req.ip;
  }
});

module.exports = { generalLimiter, authLimiter, aiRateLimiter };
