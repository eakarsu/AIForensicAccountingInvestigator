const express = require('express');
const cors = require('cors');
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

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    await sequelize.sync({ alter: true });
    console.log('Database synced');

    app.listen(PORT, () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
