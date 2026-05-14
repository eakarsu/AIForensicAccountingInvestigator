const { AuditLog } = require('../models');

/**
 * Audit-log middleware: writes one AuditLog row for every state-changing
 * request (POST/PUT/PATCH/DELETE) on /api/*. The original audit was a manual
 * POST endpoint that nothing called; this hooks into res.on('finish') so the
 * trail is automatic.
 *
 * Failures here must never break the actual request, so all logging is
 * fire-and-forget and errors are swallowed.
 */
function auditLogger(req, res, next) {
  const writeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (!writeMethods.has(req.method)) return next();
  if (!req.path.startsWith('/api/')) return next();

  res.on('finish', () => {
    // Only log successful state changes (2xx).
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    // Best-effort entity_id parsing from the URL.
    let entityId = null;
    const m = req.path.match(/\/(\d+)(?:\/|$)/);
    if (m) entityId = parseInt(m[1], 10);

    // Strip the leading /api/ and pull the resource segment.
    const segments = req.path.replace(/^\/api\//, '').split('/');
    const entityType = segments[0] || 'unknown';

    AuditLog.create({
      user_id: req.user ? req.user.id : null,
      user_name: req.user ? req.user.name || req.user.email : 'anonymous',
      action: `${req.method} ${req.path}`,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: req.ip,
      details: {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        // Avoid logging large payloads or anything sensitive (passwords).
        body_keys: req.body && typeof req.body === 'object'
          ? Object.keys(req.body).filter((k) => !/password|token|secret/i.test(k))
          : []
      }
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('Audit log write failed:', err.message);
    });
  });

  next();
}

module.exports = auditLogger;
