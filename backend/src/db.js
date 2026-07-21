// Minimal pg Pool shim for routes that expect a raw connection pool.
// Sequelize is the primary ORM; this exists only to satisfy routes that import
// '../db' and call `pool.query(...)`. All queries are .catch()-wrapped at the
// callsite, so an unreachable database degrades gracefully.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('pg pool error:', err.message);
});

module.exports = pool;
