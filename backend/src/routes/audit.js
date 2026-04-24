const express = require('express');
const { AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const allLogs = await AuditLog.findAll();

    const actionCounts = {};
    allLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = allLogs.filter(log => new Date(log.createdAt) > oneDayAgo).length;

    res.json({
      total: allLogs.length,
      action_counts: actionCounts,
      recent_activity_24h: recentActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
