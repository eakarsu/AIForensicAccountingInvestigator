'use strict';
const { sequelize } = require('./models');
sequelize.sync().then(() => sequelize.close()).catch((error) => { console.error(error); process.exit(1); });
