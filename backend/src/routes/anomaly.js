const express = require('express');
const { TransactionAnomaly } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { analyzeAnomaly } = require('../services/openrouter');
const { paginate } = require('../utils/pagination');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await paginate(TransactionAnomaly, req.query, {
      searchable: ['transaction_id', 'account_name', 'category', 'counterparty', 'anomaly_type', 'risk_level', 'status'],
      allowedSort: ['createdAt', 'amount', 'transaction_date', 'anomaly_score', 'risk_level']
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await TransactionAnomaly.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const item = await TransactionAnomaly.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const item = await TransactionAnomaly.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await TransactionAnomaly.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const item = await TransactionAnomaly.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const aiResult = await analyzeAnomaly(item.toJSON());
    await item.update({ ai_analysis: aiResult });
    res.json({ item, ai_analysis: aiResult });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
