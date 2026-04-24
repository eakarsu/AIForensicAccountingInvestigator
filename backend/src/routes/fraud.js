const express = require('express');
const { FraudScore } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { analyzeFraud } = require('../services/openrouter');

const router = express.Router();
router.use(authenticateToken);

// Get all
router.get('/', async (req, res) => {
  try {
    const items = await FraudScore.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const item = await FraudScore.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const item = await FraudScore.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const item = await FraudScore.findByPk(req.params.id);
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
    const item = await FraudScore.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Analysis
router.post('/:id/analyze', async (req, res) => {
  try {
    const item = await FraudScore.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const aiResult = await analyzeFraud(item.toJSON());
    await item.update({ ai_analysis: aiResult });
    res.json({ item, ai_analysis: aiResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
