// Minimal pg Pool shim for routes that expect a raw connection pool.
// Sequelize is the primary ORM; this exists only to satisfy routes that import
// '../db' and call `pool.query(...)`. All queries are .catch()-wrapped at the
// callsite, so an unreachable database degrades gracefully.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'forensic_accounting',
  user: process.env.DB_USER || process.env.USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('pg pool error:', err.message);
});

module.exports = pool;
