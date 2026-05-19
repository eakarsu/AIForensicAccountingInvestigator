const express = require('express');
const { BenfordAnalysis } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { analyzeBenford } = require('../services/openrouter');
const { paginate } = require('../utils/pagination');
const { analyzeBenfordRecord } = require('../utils/benfordMath');

const router = express.Router();
router.use(authenticateToken);

// Get all (paginated) — supports ?page, ?limit, ?search, ?sort_by, ?sort_order
router.get('/', async (req, res) => {
  try {
    const result = await paginate(BenfordAnalysis, req.query, {
      searchable: ['company_name', 'dataset_type', 'risk_level', 'conformity_level'],
      allowedSort: ['createdAt', 'company_name', 'deviation_score', 'risk_level']
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get by id
router.get('/:id', async (req, res) => {
  try {
    const item = await BenfordAnalysis.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    const item = await BenfordAnalysis.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const item = await BenfordAnalysis.findByPk(req.params.id);
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
    const item = await BenfordAnalysis.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.destroy();
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Analysis — now first runs the chi-square + z-score math locally so the
// LLM is asked to *interpret* numbers we trust, not invent statistics.
router.post('/:id/analyze', async (req, res) => {
  try {
    const item = await BenfordAnalysis.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    const stats = analyzeBenfordRecord(item.toJSON(), req.body && req.body.numbers);
    const enriched = stats ? { ...item.toJSON(), local_stats: stats } : item.toJSON();

    const aiResult = await analyzeBenford(enriched);
    await item.update({ ai_analysis: { ...aiResult, local_stats: stats || null } });
    res.json({ item, ai_analysis: aiResult, local_stats: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:id/compute — compute Benford stats locally without invoking the LLM.
// Useful when the caller just wants the math (chi-square, z-scores) for a UI chart.
router.post('/:id/compute', async (req, res) => {
  try {
    const item = await BenfordAnalysis.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    const stats = analyzeBenfordRecord(item.toJSON(), req.body && req.body.numbers);
    if (!stats) return res.status(400).json({ error: 'Could not compute stats — provide numbers[] or stored digit_distribution' });
    res.json({ item, local_stats: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
