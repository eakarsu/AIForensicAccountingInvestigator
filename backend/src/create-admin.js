'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { User, sequelize } = require('./models');

async function main() {
  if (process.env.ALLOW_SCHEMA_MIGRATION !== 'true') {
    throw new Error('ALLOW_SCHEMA_MIGRATION=true is required');
  }
  const email = (process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.PROVISION_ADMIN_PASSWORD || '';
  const name = (process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator').trim();
  if (!email || password.length < 12) {
    throw new Error('Admin email and a 12+ character password are required');
  }
  const hash = await bcrypt.hash(password, 12);
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    existing.name = name;
    existing.password = hash;
    existing.role = 'admin';
    existing.email_verified = true;
    await existing.save();
  } else {
    await User.create({ email, password: hash, name, role: 'admin', email_verified: true });
  }
  console.log('Administrator provisioned.');
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
