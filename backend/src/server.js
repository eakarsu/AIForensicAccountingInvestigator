const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const benfordRoutes = require('./routes/benford');
const anomalyRoutes = require('./routes/anomaly');
const embezzlementRoutes = require('./routes/embezzlement');
const fraudRoutes = require('./routes/fraud');
const auditRoutes = require('./routes/audit');
const reportRoutes = require('./routes/reports');
const ratioRoutes = require('./routes/ratios');
const importRoutes = require('./routes/data-import');
const exportRoutes = require('./routes/export');
const networkRoutes = require('./routes/network');
const aiRoutes = require('./routes/ai');
const extrasRoutes = require('./routes/extras');

const { generalLimiter, authLimiter, aiRateLimiter } = require('./middleware/rateLimiter');
const auditLogger = require('./middleware/audit');
const { assertOpenRouterConfigured } = require('./services/openrouter');

// Boot-time secret/config validation. Hard-fail in production, warn in dev.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.error('JWT_SECRET must be set in production. Refusing to start.');
  process.exit(1);
}
try {
  assertOpenRouterConfigured();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Helmet — sets standard security headers. CSP off because we do JSON only.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Env-driven CORS. Accepts a single CLIENT_URL or a comma-separated CORS_ORIGINS list.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: Origin not allowed'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limits.
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// AI rate limiter — guards every */analyze, */generate, /api/ratios/interpret,
// /api/ratios/cross-case-correlation, etc. We match by URL suffix so the
// limiter fires regardless of which resource router owns the path.
const aiPathRegex = /^\/api\/(?:.+\/(?:analyze|generate)|ratios\/(?:interpret|cross-case-correlation))(?:\/|$)/;
app.use((req, res, next) => {
  if (aiPathRegex.test(req.path)) return aiRateLimiter(req, res, next);
  next();
});

// Audit-log middleware — records every successful state change.
app.use(auditLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/benford', benfordRoutes);
app.use('/api/anomalies', anomalyRoutes);
app.use('/api/embezzlement', embezzlementRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ratios', ratioRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/extras', extrasRoutes);
app.use('/api/agentic-investigator', require('./routes/agenticInvestigator'));
app.use('/api/network-visualisation', require('./routes/networkVisualisation'));
app.use('/api/ml-fraud-scoring', require('./routes/mlFraudScoring'));
app.use('/api/time-series-anomaly', require('./routes/timeSeriesAnomaly'));
app.use('/api/related-party-analysis', require('./routes/relatedPartyAnalysis'));
app.use('/api/restatement-prediction', require('./routes/restatementPrediction'));
app.use('/api/regulatory-filing-diff', require('./routes/regulatoryFilingDiff'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — keep CORS errors visible.
app.use((err, req, res, _next) => {
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({ error: err.message || 'Server error' });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('Database connected successfully');
    // Only auto-alter in non-production to avoid silent destructive changes.
    // In production, run migrations explicitly out-of-band.
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      // eslint-disable-next-line no-console
      console.log('Database synced (dev mode)');
    } else {
      // eslint-disable-next-line no-console
      console.log('Skipping sequelize.sync in production — run migrations manually.');
    }

    
// === Batch 03 Gaps & Frontend Mounts ===
try {
  const _batch03 = require('../routes/batch03Gaps');
  if (typeof authenticateToken === 'function') app.use('/api', authenticateToken, _batch03);
  else app.use('/api', _batch03);
} catch (_e) { /* batch03 gap routes optional */ }

app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
