const express = require('express');
const { InvestigationReport } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get next report number
router.get('/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `RPT-${year}-`;

    const latest = await InvestigationReport.findOne({
      where: { report_number: { [require('sequelize').Op.like]: `${prefix}%` } },
      order: [['report_number', 'DESC']]
    });

    let nextNum = 1;
    if (latest) {
      const currentNum = parseInt(latest.report_number.replace(prefix, ''));
      nextNum = currentNum + 1;
    }

    const report_number = `${prefix}${String(nextNum).padStart(3, '0')}`;
    res.json({ report_number });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all
router.get('/', async (req, res) => {
  try {
    const items = await InvestigationReport.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const item = await InvestigationReport.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const item = await InvestigationReport.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
