const express = require('express');
const { FraudScore } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { analyzeFraud } = require('../services/openrouter');
const { paginate } = require('../utils/pagination');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await paginate(FraudScore, req.query, {
      searchable: ['company_name', 'fiscal_year', 'risk_level', 'status'],
      allowedSort: ['createdAt', 'overall_score', 'altman_z_score', 'beneish_m_score', 'risk_level']
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await FraudScore.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await FraudScore.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
